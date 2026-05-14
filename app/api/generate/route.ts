import { anthropic } from '@/lib/anthropic/client'
import { buildVibeCheckPrompt, buildReplyGenerationPrompt, Message } from '@/lib/prompts'
import { createClient } from '@/lib/supabase/server'

const VALID_GOALS = ['reply', 'flirt', 'ask_out', 'revive', 'recover', 'open'] as const
// Must match the schema check constraint exactly
const VALID_TONES = ['casual', 'witty', 'charming', 'bold', 'romantic'] as const
const FREE_TIER_DAILY_LIMIT = 3
const MODEL = 'claude-sonnet-4-6'

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

type ClaudeResult = { data: unknown; inputTokens: number; outputTokens: number }

async function callClaude(
  system: string,
  userMessage: string,
  temperature: number,
  maxTokens: number,
): Promise<ClaudeResult> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let inputTokens = response.usage.input_tokens
  let outputTokens = response.usage.output_tokens

  try {
    return { data: JSON.parse(stripCodeFences(text)), inputTokens, outputTokens }
  } catch {
    const retry = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: text },
        { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON object, no other text.' },
      ],
    })
    const retryText = retry.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
    inputTokens += retry.usage.input_tokens
    outputTokens += retry.usage.output_tokens
    return { data: JSON.parse(stripCodeFences(retryText)), inputTokens, outputTokens }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json(
      { error: { code: 'unauthorized', message: 'You must be signed in to generate replies.' } },
      { status: 401 },
    )
  }

  // Fetch profile for subscription status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile fetch failed:', profileError)
    return Response.json(
      { error: { code: 'profile_not_found', message: 'User profile not found.' } },
      { status: 500 },
    )
  }

  const isFree = profile.subscription_status === 'free'

  // Check daily limit before any Anthropic calls
  let currentDailyCount = 0
  if (isFree) {
    const { data: count, error: countError } = await supabase
      .rpc('check_and_reset_daily_count', { p_user_id: user.id })

    if (countError) {
      console.error('Daily count check failed:', countError)
      return Response.json(
        { error: { code: 'internal_error', message: 'Could not check usage limit.' } },
        { status: 500 },
      )
    }

    currentDailyCount = count ?? 0
    const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - currentDailyCount)

    if (remaining === 0) {
      // Reset is at next UTC midnight
      const tomorrow = new Date()
      tomorrow.setUTCHours(24, 0, 0, 0)
      return Response.json(
        {
          error: {
            code: 'daily_limit_reached',
            message: "You've used all 3 free replies today. Upgrade to keep going or come back tomorrow.",
            details: {
              resets_at: tomorrow.toISOString(),
              upgrade_url: '/api/stripe/checkout',
            },
          },
        },
        { status: 402 },
      )
    }
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'bad_request', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    )
  }

  const {
    messages,
    goal,
    tone,
    context_notes,
    style_notes,
    platform,
    person_name,
    source = 'paste',
    conversation_id: existingConversationId,
  } = body as {
    messages?: unknown
    goal?: unknown
    tone?: unknown
    context_notes?: string
    style_notes?: string
    platform?: string
    person_name?: string
    source?: string
    conversation_id?: string
  }

  if (!Array.isArray(messages) || messages.length < 1) {
    return Response.json(
      { error: { code: 'messages_too_short', message: 'messages must be a non-empty array.' } },
      { status: 400 },
    )
  }

  if (!VALID_GOALS.includes(goal as (typeof VALID_GOALS)[number])) {
    return Response.json(
      { error: { code: 'invalid_goal', message: `goal must be one of: ${VALID_GOALS.join(', ')}` } },
      { status: 400 },
    )
  }

  if (!VALID_TONES.includes(tone as (typeof VALID_TONES)[number])) {
    return Response.json(
      { error: { code: 'invalid_tone', message: `tone must be one of: ${VALID_TONES.join(', ')}` } },
      { status: 400 },
    )
  }

  const typedMessages = messages as Message[]

  // ── Conversation: reuse existing or create new ─────────────────
  let conversationId: string

  if (existingConversationId) {
    // Validate the conversation belongs to this user (RLS also enforces this)
    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', existingConversationId)
      .eq('user_id', user.id)
      .single()

    if (!existingConvo) {
      return Response.json(
        { error: { code: 'not_found', message: 'Conversation not found.' } },
        { status: 404 },
      )
    }
    conversationId = existingConversationId
  } else {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        source: source === 'screenshot' ? 'screenshot' : 'paste',
        platform: platform ?? null,
        person_name: person_name ?? null,
        context_notes: context_notes ?? null,
        parsing_confidence: 'high',
      })
      .select('id')
      .single()

    if (convError || !conversation) {
      console.error('Conversation insert failed:', convError)
      return Response.json(
        { error: { code: 'db_error', message: 'Failed to save conversation.' } },
        { status: 500 },
      )
    }

    conversationId = conversation.id

    // Insert messages only for new conversations
    const { error: msgError } = await supabase
      .from('messages')
      .insert(
        typedMessages.map(m => ({
          conversation_id: conversationId,
          sender: m.sender,
          content: m.content,
          order_index: m.order_index,
        })),
      )

    if (msgError) {
      console.error('Messages insert failed:', msgError)
    }
  }

  // ── Claude calls ───────────────────────────────────────────────
  const startMs = Date.now()
  let totalInputTokens = 0
  let totalOutputTokens = 0

  // Step 1: vibe check
  type VibeResult = {
    engagement: string
    reasoning: string
    user_facing_note: string
    recommended_intensity: string
  }
  let vibe: VibeResult

  try {
    const { system, user: userMsg } = buildVibeCheckPrompt(typedMessages, context_notes)
    const result = await callClaude(system, userMsg, 0.3, 400)
    vibe = result.data as VibeResult
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens
  } catch (err) {
    await supabase.from('generations').insert({
      user_id: user.id,
      conversation_id: conversationId,
      goal: goal as string,
      tone: tone as string,
      model_used: MODEL,
      latency_ms: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    })
    console.error('Vibe check failed:', err)
    return Response.json(
      { error: { code: 'ai_call_failed', message: 'Vibe check failed. Please try again.' } },
      { status: 500 },
    )
  }

  // Step 2: reply generation
  type RepliesRaw = { replies?: unknown[]; safety_redirect?: string }
  let repliesRaw: RepliesRaw

  try {
    const { system, user: userMsg } = buildReplyGenerationPrompt(
      typedMessages,
      {
        engagement: vibe.engagement,
        reasoning: vibe.reasoning,
        recommended_intensity: vibe.recommended_intensity,
      },
      goal as string,
      tone as string,
      context_notes,
      style_notes,
    )
    const result = await callClaude(system, userMsg, 0.8, 1500)
    repliesRaw = result.data as RepliesRaw
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens
  } catch (err) {
    await supabase.from('generations').insert({
      user_id: user.id,
      conversation_id: conversationId,
      goal: goal as string,
      tone: tone as string,
      vibe_engagement: vibe.engagement,
      vibe_reasoning: vibe.reasoning,
      vibe_user_note: vibe.user_facing_note,
      vibe_intensity: vibe.recommended_intensity,
      model_used: MODEL,
      input_token_count: totalInputTokens,
      output_token_count: totalOutputTokens,
      latency_ms: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    })
    console.error('Reply generation failed:', err)
    return Response.json(
      { error: { code: 'ai_call_failed', message: 'Reply generation failed. Please try again.' } },
      { status: 500 },
    )
  }

  const latencyMs = Date.now() - startMs

  // Safety redirect — save generation with error marker, don't save replies
  if (repliesRaw.safety_redirect) {
    await supabase.from('generations').insert({
      user_id: user.id,
      conversation_id: conversationId,
      goal: goal as string,
      tone: tone as string,
      vibe_engagement: vibe.engagement,
      vibe_reasoning: vibe.reasoning,
      vibe_user_note: vibe.user_facing_note,
      vibe_intensity: vibe.recommended_intensity,
      model_used: MODEL,
      input_token_count: totalInputTokens,
      output_token_count: totalOutputTokens,
      latency_ms: latencyMs,
      error: 'safety_redirect',
    })
    return Response.json(
      {
        error: {
          code: 'safety_redirect',
          message: repliesRaw.safety_redirect,
          details: { reason: 'intensity_mismatch', suggested_alternative_goal: 'reply' },
        },
      },
      { status: 422 },
    )
  }

  // ── Insert generation row ──────────────────────────────────────
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      goal: goal as string,
      tone: tone as string,
      vibe_engagement: vibe.engagement,
      vibe_reasoning: vibe.reasoning,
      vibe_user_note: vibe.user_facing_note,
      vibe_intensity: vibe.recommended_intensity,
      model_used: MODEL,
      input_token_count: totalInputTokens,
      output_token_count: totalOutputTokens,
      latency_ms: latencyMs,
    })
    .select('id')
    .single()

  if (genError || !generation) {
    console.error('Generation insert failed:', genError)
    return Response.json(
      { error: { code: 'db_error', message: 'Failed to save generation.' } },
      { status: 500 },
    )
  }

  const generationId = generation.id

  // ── Insert replies ─────────────────────────────────────────────
  type RawReply = { content: string; tone_tags: string[]; reasoning: string; rank: number }
  const rawReplies = (repliesRaw.replies ?? []) as RawReply[]

  const { data: insertedReplies, error: repliesError } = await supabase
    .from('replies')
    .insert(
      rawReplies.map(r => ({
        generation_id: generationId,
        user_id: user.id,
        content: r.content,
        tone_tags: r.tone_tags ?? [],
        reasoning: r.reasoning ?? null,
        rank: r.rank,
      })),
    )
    .select('id, content, tone_tags, reasoning, rank')

  if (repliesError || !insertedReplies) {
    console.error('Replies insert failed:', repliesError)
    return Response.json(
      { error: { code: 'db_error', message: 'Failed to save replies.' } },
      { status: 500 },
    )
  }

  // ── Increment daily counter (free users) ───────────────────────
  let dailyRepliesRemaining: number | null = null // null = unlimited

  if (isFree) {
    const { data: newCount } = await supabase
      .rpc('increment_daily_count', { p_user_id: user.id })
    dailyRepliesRemaining = Math.max(0, FREE_TIER_DAILY_LIMIT - (newCount ?? FREE_TIER_DAILY_LIMIT))
  }

  // ── Log usage event ────────────────────────────────────────────
  await supabase.from('usage_events').insert({
    user_id: user.id,
    event_type: 'generation',
    cost_tokens: totalInputTokens + totalOutputTokens,
    metadata: {
      goal,
      tone,
      vibe_engagement: vibe.engagement,
      conversation_id: conversationId,
      generation_id: generationId,
    },
  })

  return Response.json(
    {
      generation_id: generationId,
      conversation_id: conversationId,
      user_id: user.id,
      vibe,
      replies: insertedReplies,
      usage: {
        daily_replies_remaining: dailyRepliesRemaining,
        daily_replies_total: FREE_TIER_DAILY_LIMIT,
        is_pro: !isFree,
      },
    },
    { status: 201 },
  )
}
