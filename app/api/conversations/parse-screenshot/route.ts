import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic/client'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// ── EXIF stripping (JPEG APP1 segments only) ──────────────────────────────────

function stripJpegExif(buf: Uint8Array): Uint8Array {
  // Must start with FFD8 (JPEG SOI)
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return buf

  const kept: Uint8Array[] = []
  let i = 2

  while (i < buf.length - 1) {
    if (buf[i] !== 0xFF) {
      // Raw scan data after SOS — include everything remaining
      kept.push(buf.slice(i))
      break
    }
    const marker = buf[i + 1]
    if (marker === 0xD9) { // EOI
      kept.push(buf.slice(i))
      break
    }
    if (marker === 0xDA) { // SOS — rest is compressed image data
      kept.push(buf.slice(i))
      break
    }
    // Markers with no length field (RST0-RST7, SOI, TEM)
    if ((marker >= 0xD0 && marker <= 0xD8) || marker === 0x01) {
      kept.push(buf.slice(i, i + 2))
      i += 2
      continue
    }
    // Markers with a 2-byte length (length includes itself but not the 2-byte marker)
    const segLen = (buf[i + 2] << 8) | buf[i + 3]
    const segEnd = i + 2 + segLen
    // Skip APP1 (0xFFE1) — that's where EXIF lives
    if (marker !== 0xE1) {
      kept.push(buf.slice(i, segEnd))
    }
    i = segEnd
  }

  const total = 2 + kept.reduce((a, s) => a + s.length, 0)
  const out = new Uint8Array(total)
  out[0] = 0xFF; out[1] = 0xD8
  let pos = 2
  for (const seg of kept) { out.set(seg, pos); pos += seg.length }
  return out
}

// ── Screenshot vision system prompt (from docs/rizzcraft-ai-prompts.md §5) ───

const SCREENSHOT_SYSTEM = `You are a precise screenshot parser for RizzCraft.

TASK: This image is a screenshot of a text or dating-app conversation. Parse it into structured data.

Return a single JSON object with EXACTLY this structure (no other text):

{
  "platform": "imessage" | "whatsapp" | "hinge" | "bumble" | "instagram" | "telegram" | "tinder" | "unknown",
  "messages": [
    {
      "sender": "me" | "them",
      "content": "<exact text of the message, no paraphrasing>",
      "order_index": <integer, 1-indexed, chronological top-to-bottom>
    }
  ],
  "confidence": "high" | "medium" | "low",
  "needs_confirmation": <true | false — true if there is any ambiguity about who said what>,
  "notes": "<short caveats: 'time gap visible between messages 3 and 4', 'last message partially cut off', etc. Empty string if none.>"
}

IDENTIFICATION RULES:

- "me" = the user (right-aligned bubbles in most apps, usually a colored bubble like blue/green/peach)
- "them" = the other person (left-aligned bubbles, usually gray/white)
- Parse messages top-to-bottom in chronological order. Top is older, bottom is newer.
- Skip system messages: timestamps shown between messages, "Read", "Delivered", typing indicators, "Now active", profile names at the top of screen unless context_notes are absent.
- Preserve emojis as Unicode characters.
- Do NOT paraphrase. Give exact wording. If you cannot read a word, mark it as [unclear] in the content.
- Reaction emojis (small overlay icons) are not messages — skip them.
- If a message is split across multiple bubbles from the same sender consecutively, treat each bubble as a separate message in order.

CONFIDENCE LEVELS:

- high: clear bubbles, clear authorship, full text readable
- medium: minor ambiguity about one or two messages, or partial text cut off at edges
- low: heavy ambiguity, unusual layout, hard to determine senders, significant cropping

If confidence is "low", set needs_confirmation to true.

PRIVACY: Do not include the other person's profile name in person_name unless it appears unambiguously in the conversation. Do not include phone numbers, email addresses, or personally identifying info beyond first names visible in the chat.`

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function parseWithClaude(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  contextNotes?: string,
) {
  const userText = contextNotes
    ? `Parse this screenshot into structured conversation data.\n\nContext: ${contextNotes}`
    : 'Parse this screenshot into structured conversation data.'

  const makeMessages = () => [{
    role: 'user' as const,
    content: [
      { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } },
      { type: 'text' as const, text: userText },
    ],
  }]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    temperature: 0.2,
    system: SCREENSHOT_SYSTEM,
    messages: makeMessages(),
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    return JSON.parse(stripFences(text))
  } catch {
    const retry = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.2,
      system: SCREENSHOT_SYSTEM,
      messages: [
        ...makeMessages(),
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: { code: 'bad_request', message: 'Expected multipart form data.' } },
      { status: 400 },
    )
  }

  const imageFile = formData.get('image')
  const contextNotes = formData.get('context_notes')

  if (!(imageFile instanceof File)) {
    return Response.json(
      { error: { code: 'missing_image', message: 'No image provided.' } },
      { status: 400 },
    )
  }

  if (!ACCEPTED_TYPES.has(imageFile.type)) {
    return Response.json(
      { error: { code: 'unsupported_format', message: 'Only JPEG, PNG, and WebP images are supported.' } },
      { status: 400 },
    )
  }

  if (imageFile.size > MAX_BYTES) {
    return Response.json(
      { error: { code: 'image_too_large', message: 'Screenshot must be under 10 MB.' } },
      { status: 400 },
    )
  }

  // Read into memory, strip EXIF if JPEG — never written to disk
  const rawBuf = await imageFile.arrayBuffer()
  const rawBytes = new Uint8Array(rawBuf)
  const bytes = imageFile.type === 'image/jpeg' ? stripJpegExif(rawBytes) : rawBytes

  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp'

  const notes = typeof contextNotes === 'string' ? contextNotes : undefined

  let parsed: {
    platform?: string
    messages?: { sender: string; content: string; order_index?: number }[]
    confidence?: string
    needs_confirmation?: boolean
    notes?: string
  }

  try {
    parsed = await parseWithClaude(base64, mediaType, notes)
  } catch (err) {
    console.error('parse-screenshot Claude call failed:', err)
    return Response.json(
      { error: { code: 'internal_error', message: 'Parse failed. Please try again with a clearer screenshot.' } },
      { status: 500 },
    )
  }

  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    return Response.json(
      { error: { code: 'not_a_conversation', message: "I couldn't find a conversation in this screenshot. Make sure the full chat is visible." } },
      { status: 400 },
    )
  }

  // Log analytics (fire-and-forget — don't await, don't block response)
  void Promise.resolve(supabase.from('usage_events').insert({
    user_id: user.id,
    event_type: 'screenshot_parse',
  }))

  const confidence = parsed.confidence ?? 'medium'
  const needsConfirmation = parsed.needs_confirmation ?? (confidence !== 'high')

  return Response.json({
    platform: parsed.platform ?? 'unknown',
    messages: parsed.messages.map((m, i) => ({
      sender: m.sender === 'me' ? 'me' : 'them',
      content: String(m.content),
      order_index: m.order_index ?? i + 1,
    })),
    confidence,
    needs_confirmation: needsConfirmation,
    notes: parsed.notes ?? '',
  })
}
