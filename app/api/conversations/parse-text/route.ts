import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic/client'

// ~4000 tokens ≈ 16 000 chars for average English text
const MAX_CHARS = 16000

// ── Heuristic parser ──────────────────────────────────────────────────────────

type ParsedMessage = { sender: 'me' | 'them'; content: string; order_index: number }

function tryHeuristics(text: string): ParsedMessage[] | null {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const messages: ParsedMessage[] = []
  for (let i = 0; i < lines.length; i++) {
    const meMatch = lines[i].match(/^(?:me|i)\s*:\s*(.+)/i)
    const themMatch = lines[i].match(/^(?:them|you|her|him|they|she|he)\s*:\s*(.+)/i)
    if (meMatch) {
      messages.push({ sender: 'me', content: meMatch[1].trim(), order_index: i + 1 })
    } else if (themMatch) {
      messages.push({ sender: 'them', content: themMatch[1].trim(), order_index: i + 1 })
    } else {
      return null // any unrecognised line → fall through to Claude
    }
  }
  return messages.length > 0 ? messages : null
}

// ── Claude fallback (Haiku — cheap, fast, good enough for parsing) ─────────────

const PARSE_SYSTEM = `You are a conversation parser for RizzCraft, a dating texting copilot.

TASK: Parse the pasted conversation and identify who said what.

Return a single JSON object with EXACTLY this structure (no other text):
{
  "platform": "imessage" | "whatsapp" | "hinge" | "bumble" | "instagram" | "unknown",
  "messages": [
    { "sender": "me" | "them", "content": "<exact text>", "order_index": 1 }
  ],
  "confidence": "high" | "medium" | "low",
  "needs_confirmation": <true | false>,
  "notes": "<brief caveat or empty string>"
}

RULES:
- "me" = the person seeking help (labelled Me:, I:, or contextually the advice-seeker)
- "them" = the other person (their name, Her:, Him:, Them:, You:, or inferred from position)
- Parse chronologically top-to-bottom; preserve exact wording including typos and emojis
- confidence "high" = clear labels or unambiguous structure
- confidence "medium" = minor uncertainty in 1-2 messages
- confidence "low" = significant ambiguity throughout
- Set needs_confirmation true when confidence is "medium" or "low"
- Return an empty messages array if the text is not a conversation`

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function parseWithClaude(rawText: string, contextNotes?: string) {
  const contextLine = contextNotes ? `\nContext: ${contextNotes}` : ''
  const userMsg = `Parse this conversation:${contextLine}\n\n${rawText}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
    temperature: 0.2,
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    return JSON.parse(stripFences(text))
  } catch {
    // One retry with explicit instruction
    const retry = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.2,
      system: PARSE_SYSTEM,
      messages: [
        { role: 'user', content: userMsg },
        { role: 'assistant', content: text },
        { role: 'user', content: 'Return ONLY the JSON object, no other text.' },
      ],
    })
    const retryText = retry.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
    return JSON.parse(stripFences(retryText))
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json(
      { error: { code: 'unauthorized', message: 'Must be signed in.' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'bad_request', message: 'Invalid JSON.' } },
      { status: 400 },
    )
  }

  const { raw_text, context_notes } = body as { raw_text?: string; context_notes?: string }

  if (!raw_text?.trim()) {
    return Response.json(
      { error: { code: 'empty_text', message: 'raw_text is required.' } },
      { status: 400 },
    )
  }

  if (raw_text.length > MAX_CHARS) {
    return Response.json(
      { error: { code: 'text_too_long', message: 'Conversation is too long — trim to the most relevant messages.' } },
      { status: 400 },
    )
  }

  // ── Try heuristics first (no Claude cost) ────────────────────────────────
  const heuristic = tryHeuristics(raw_text)
  if (heuristic) {
    return Response.json({
      platform: 'unknown',
      messages: heuristic,
      confidence: 'high',
      needs_confirmation: false,
      notes: '',
    })
  }

  // ── Claude fallback ──────────────────────────────────────────────────────
  try {
    const parsed = await parseWithClaude(raw_text, context_notes)

    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return Response.json(
        {
          error: {
            code: 'could_not_parse',
            message: "I couldn't find a recognizable conversation. Try formatting each line as 'me: ...' or 'them: ...'",
          },
        },
        { status: 400 },
      )
    }

    return Response.json({
      platform: parsed.platform ?? 'unknown',
      messages: (parsed.messages as { sender: string; content: string; order_index?: number }[]).map((m, i) => ({
        sender: m.sender === 'me' ? 'me' : 'them',
        content: String(m.content),
        order_index: m.order_index ?? i + 1,
      })),
      confidence: parsed.confidence ?? 'medium',
      needs_confirmation: parsed.needs_confirmation ?? true,
      notes: parsed.notes ?? '',
    })
  } catch (err) {
    console.error('parse-text Claude call failed:', err)
    return Response.json(
      { error: { code: 'internal_error', message: "Parse failed. Try formatting as 'me: ...' or 'them: ...' per line." } },
      { status: 500 },
    )
  }
}
