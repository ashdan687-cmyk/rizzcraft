'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { sender: 'me' | 'them'; content: string; order_index: number }

type VibeResult = {
  engagement: 'engaged' | 'neutral' | 'cold'
  reasoning: string
  user_facing_note: string
  recommended_intensity: 'low' | 'medium' | 'high'
}

type Reply = {
  id: string
  content: string
  tone_tags: string[]
  reasoning: string
  rank: number
}

type GenerateResult = {
  generation_id: string
  conversation_id: string
  vibe: VibeResult
  replies: Reply[]
  usage: { daily_replies_remaining: number | null; is_pro: boolean }
}

type InputTab = 'paste' | 'upload'

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS = [
  { value: 'reply',   label: 'Keep it going' },
  { value: 'flirt',   label: 'Flirt' },
  { value: 'ask_out', label: 'Ask out' },
  { value: 'revive',  label: 'Revive a cold chat' },
  { value: 'recover', label: 'Recover from awkward' },
  { value: 'open',    label: 'Open a conversation' },
]

const TONES = [
  { value: 'casual',   label: 'Casual' },
  { value: 'witty',    label: 'Witty' },
  { value: 'charming', label: 'Charming' },
  { value: 'bold',     label: 'Bold' },
  { value: 'romantic', label: 'Romantic' },
]

const VIBE_DOT: Record<string, string> = {
  engaged: 'var(--green)',
  neutral:  'var(--amber)',
  cold:     'var(--cream-faint)',
}

const PLATFORM_LABELS: Record<string, string> = {
  imessage:  'iMessage',
  whatsapp:  'WhatsApp',
  hinge:     'Hinge',
  bumble:    'Bumble',
  instagram: 'Instagram',
  telegram:  'Telegram',
  tinder:    'Tinder',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.68rem', fontWeight: 500,
      letterSpacing: '0.09em', textTransform: 'uppercase' as const,
      color: 'var(--cream-faint)', marginBottom: '0.35rem',
    }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  background: 'var(--bg3)', border: '1px solid var(--border-light)',
  borderRadius: 8, padding: '0.6rem 0.75rem',
  color: 'var(--cream)', fontSize: '0.85rem',
  fontFamily: 'inherit', outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a5347' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.6rem center',
  paddingRight: '1.75rem',
}

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(212,83,58,0.1)',
  border: '1px solid rgba(212,83,58,0.25)',
  borderRadius: 8, padding: '0.65rem 0.85rem',
  fontSize: '0.8rem', color: '#e07d6a',
  marginBottom: '0.75rem', lineHeight: 1.5,
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean
  onClose: () => void
  isFree: boolean
  remaining: number | null
  onGenerated: (newRemaining: number | null) => void
  prefillMessages?: Message[]
  existingConversationId?: string
}

type Step = 'form' | 'loading' | 'confirming' | 'results'

export default function NewConversationSheet({
  isOpen, onClose, isFree, remaining, onGenerated, prefillMessages, existingConversationId,
}: Props) {
  const [step, setStep] = useState<Step>('form')
  const [activeTab, setActiveTab] = useState<InputTab>('paste')
  const [convoText, setConvoText] = useState('')
  const [goal, setGoal] = useState('reply')
  const [tone, setTone] = useState('casual')
  const [contextNotes, setContextNotes] = useState('')
  const [personName, setPersonName] = useState('')
  const [platform, setPlatform] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [parsedMessages, setParsedMessages] = useState<Message[] | null>(null)
  const [parseNotes, setParseNotes] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null)
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load tab preference from localStorage (client-only, runs once)
  useEffect(() => {
    const saved = localStorage.getItem('rc-input-tab')
    if (saved === 'paste' || saved === 'upload') setActiveTab(saved)
  }, [])

  // Reset form when sheet opens; revoke any stale object URL
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setError(null)
      setParsedMessages(null)
      setParseNotes('')
      setDetectedPlatform(null)
      setScreenshotFile(null)
      setScreenshotPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [isOpen])

  function switchTab(tab: InputTab) {
    setActiveTab(tab)
    localStorage.setItem('rc-input-tab', tab)
    setError(null)
  }

  // ── File handling ─────────────────────────────────────────────────────────

  function handleFileSelect(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot is too large. Please use an image under 10 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP screenshots are supported.')
      return
    }
    setError(null)
    setScreenshotPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setScreenshotFile(file)
    setScreenshotPreviewUrl(URL.createObjectURL(file))
  }

  function removeFile() {
    setScreenshotPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setScreenshotFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Parse → confirm or generate ──────────────────────────────────────────

  async function handleGenerate() {
    // Pre-filled messages (from conversation detail) skip parsing entirely
    if (prefillMessages) {
      await doGenerate(prefillMessages)
      return
    }

    if (activeTab === 'upload') {
      if (!screenshotFile) {
        setError('Choose a screenshot to get started.')
        return
      }
      setError(null)
      setStep('loading')
      try {
        const fd = new FormData()
        fd.append('image', screenshotFile)
        if (contextNotes) fd.append('context_notes', contextNotes)

        const parseRes = await fetch('/api/conversations/parse-screenshot', {
          method: 'POST',
          body: fd,
        })
        const parseData = await parseRes.json()

        if (!parseRes.ok) {
          setError(parseData.error?.message ?? "Couldn't read this screenshot. Try a clearer image.")
          setStep('form')
          return
        }

        setParsedMessages(parseData.messages)
        setParseNotes(parseData.notes ?? '')
        setDetectedPlatform(parseData.platform ?? null)
        setStep('confirming') // screenshots always show confirming step
      } catch {
        setError('Network error. Check your connection and try again.')
        setStep('form')
      }
      return
    }

    // Paste tab
    if (!convoText.trim()) {
      setError('Paste a conversation to get started.')
      return
    }
    setError(null)
    setStep('loading')

    try {
      const parseRes = await fetch('/api/conversations/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: convoText, context_notes: contextNotes || undefined }),
      })
      const parseData = await parseRes.json()

      if (!parseRes.ok) {
        setError(
          parseData.error?.message ??
          "I couldn't read this. Try formatting each line as 'me: ...' or 'them: ...'",
        )
        setStep('form')
        return
      }

      setParsedMessages(parseData.messages)
      setParseNotes(parseData.notes ?? '')
      setDetectedPlatform(null)

      if (parseData.confidence === 'high' && !parseData.needs_confirmation) {
        await doGenerate(parseData.messages)
      } else {
        setStep('confirming')
      }
    } catch {
      setError('Network error. Check your connection and try again.')
      setStep('form')
    }
  }

  // ── Call /api/generate with resolved messages ─────────────────────────────

  async function doGenerate(messages: Message[]) {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          goal,
          tone,
          context_notes: contextNotes || undefined,
          person_name: personName || undefined,
          platform: platform ? platform.toLowerCase() : undefined,
          source: activeTab === 'upload' ? 'screenshot' : 'paste',
          ...(existingConversationId ? { conversation_id: existingConversationId } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setError("You've used all 3 free replies today. Come back tomorrow or upgrade to Pro.")
        } else {
          setError(data.error?.message ?? 'Something went wrong. Please try again.')
        }
        setStep('form')
        return
      }

      setResult(data)
      onGenerated(data.usage.daily_replies_remaining)
      setStep('results')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStep('form')
    }
  }

  async function copyReply(reply: Reply) {
    try {
      await navigator.clipboard.writeText(reply.content)
      setCopiedId(reply.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard API unavailable
    }
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canGenerate = Boolean(prefillMessages) ||
    (activeTab === 'paste' ? convoText.trim().length > 0 : Boolean(screenshotFile))

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(13,12,11,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 64, left: '50%',
        transform: `translateX(-50%) translateY(${isOpen ? '0' : '105%'})`,
        width: '100%', maxWidth: 390,
        maxHeight: 'calc(100dvh - 64px)',
        background: 'var(--bg2)',
        border: '1px solid var(--border-light)',
        borderRadius: '18px 18px 0 0',
        zIndex: 50,
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Drag handle */}
        <div style={{ paddingTop: 12, paddingBottom: 6, flexShrink: 0 }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'var(--cream-faint)', margin: '0 auto',
          }} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1rem' }}>

          {/* ── FORM ─────────────────────────────────────────────── */}
          {step === 'form' && (
            <>
              <div style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: '1.2rem', fontWeight: 500,
                color: 'var(--cream)', paddingTop: '0.5rem', marginBottom: '1.25rem',
              }}>
                New conversation
              </div>

              {/* Tab switcher — hidden when pre-filled */}
              {!prefillMessages && (
                <div style={{
                  display: 'flex', gap: 0, marginBottom: '1rem',
                  background: 'var(--bg3)', border: '1px solid var(--border-light)',
                  borderRadius: 8, padding: 3,
                }}>
                  {(['paste', 'upload'] as InputTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => switchTab(tab)}
                      style={{
                        flex: 1, padding: '6px 0', border: 'none', borderRadius: 6,
                        background: activeTab === tab ? 'var(--bg)' : 'transparent',
                        color: activeTab === tab ? 'var(--cream)' : 'var(--cream-dim)',
                        fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer',
                        fontWeight: activeTab === tab ? 500 : 400,
                        transition: 'all 0.15s',
                        boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {tab === 'paste' ? 'Paste text' : 'Screenshot'}
                    </button>
                  ))}
                </div>
              )}

              {/* Input area */}
              {prefillMessages ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--amber-faint)', border: '1px solid var(--border-amber)',
                  borderRadius: 8, padding: '0.65rem 0.85rem', marginBottom: '0.75rem',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--amber)' }}>◐</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--cream-dim)', fontWeight: 300 }}>
                    {prefillMessages.length} messages loaded from conversation
                  </span>
                </div>
              ) : activeTab === 'paste' ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  <FieldLabel>Conversation</FieldLabel>
                  <textarea
                    value={convoText}
                    onChange={e => setConvoText(e.target.value)}
                    placeholder={"them: hey, you coming to the thing Saturday?\nme: depends, what thing\nthem: you'll see 😏"}
                    rows={6}
                    autoFocus
                    style={{
                      ...inputStyle,
                      fontFamily: 'var(--font-mono), monospace',
                      lineHeight: 1.65, resize: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.67rem', color: 'var(--cream-faint)', marginTop: 5, lineHeight: 1.5 }}>
                    Paste normally — any format works. We&apos;ll figure out who said what.
                  </p>
                </div>
              ) : (
                /* Upload zone */
                <div style={{ marginBottom: '0.75rem' }}>
                  <FieldLabel>Screenshot</FieldLabel>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(f)
                    }}
                  />

                  {screenshotPreviewUrl ? (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotPreviewUrl}
                        alt="Screenshot preview"
                        style={{
                          width: '100%', maxHeight: 200, objectFit: 'cover',
                          borderRadius: 8, display: 'block',
                          border: '1px solid var(--border-light)',
                        }}
                      />
                      <button
                        onClick={removeFile}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(13,12,11,0.7)', border: 'none', borderRadius: 4,
                          color: 'var(--cream)', fontSize: '0.7rem', padding: '3px 8px',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                      style={{
                        border: '1px dashed var(--border-amber)',
                        borderRadius: 10, padding: '1.5rem 1rem', textAlign: 'center',
                        cursor: 'pointer', marginBottom: 8,
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'var(--amber)'
                        el.style.background = 'var(--amber-faint)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'var(--border-amber)'
                        el.style.background = 'transparent'
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', color: 'var(--amber)', marginBottom: 6 }}>⊡</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontWeight: 300 }}>
                        Tap to choose a screenshot
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--cream-faint)', marginTop: 3 }}>
                        iMessage · WhatsApp · Hinge · Bumble · Instagram
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: '0.67rem', color: 'var(--cream-faint)', marginTop: 4, lineHeight: 1.5 }}>
                    🔒 Screenshots are never saved
                  </p>
                </div>
              )}

              {/* Goal + Tone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div>
                  <FieldLabel>Goal</FieldLabel>
                  <select value={goal} onChange={e => setGoal(e.target.value)} style={selectStyle}>
                    {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Tone</FieldLabel>
                  <select value={tone} onChange={e => setTone(e.target.value)} style={selectStyle}>
                    {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Their name + Platform */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div>
                  <FieldLabel>Their name <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.62rem' }}>(optional)</span></FieldLabel>
                  <input type="text" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Amara" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Platform <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.62rem' }}>(optional)</span></FieldLabel>
                  <input type="text" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Hinge" style={inputStyle} />
                </div>
              </div>

              {/* Context */}
              <div style={{ marginBottom: '1rem' }}>
                <FieldLabel>Context <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.62rem' }}>(optional)</span></FieldLabel>
                <input
                  type="text" value={contextNotes}
                  onChange={e => setContextNotes(e.target.value)}
                  placeholder="Met at a party last weekend, talking for 3 days"
                  style={inputStyle}
                />
              </div>

            </>
          )}

          {/* ── CONFIRMING ────────────────────────────────────────── */}
          {step === 'confirming' && parsedMessages && (
            <>
              <div style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: '1.2rem', fontWeight: 500,
                color: 'var(--cream)', paddingTop: '0.5rem', marginBottom: '0.35rem',
              }}>
                Does this look right?
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.5, marginBottom: '0.85rem' }}>
                I found {parsedMessages.length} messages. Check that &ldquo;me&rdquo; and &ldquo;them&rdquo; are correct before generating.
              </p>

              {/* Platform badge (screenshots only) */}
              {detectedPlatform && detectedPlatform !== 'unknown' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                    background: 'var(--bg3)', border: '1px solid var(--border-light)',
                    color: 'var(--cream-dim)',
                  }}>
                    {PLATFORM_LABELS[detectedPlatform] ?? detectedPlatform}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--cream-faint)' }}>detected</span>
                </div>
              )}

              {parseNotes && (
                <div style={{
                  fontSize: '0.72rem', color: 'var(--cream-dim)',
                  background: 'var(--bg3)', border: '1px solid var(--border-light)',
                  borderRadius: 6, padding: '0.5rem 0.7rem', marginBottom: '0.75rem', lineHeight: 1.5,
                }}>
                  Note: {parseNotes}
                </div>
              )}

              {/* Message preview bubbles */}
              <div style={{ maxHeight: 210, overflowY: 'auto', marginBottom: '0.85rem', padding: '2px 0' }}>
                {parsedMessages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                    marginBottom: 5,
                  }}>
                    <div style={{
                      maxWidth: '78%',
                      background: msg.sender === 'me' ? 'var(--amber-faint)' : 'var(--bg3)',
                      border: `1px solid ${msg.sender === 'me' ? 'var(--border-amber)' : 'var(--border-light)'}`,
                      borderRadius: msg.sender === 'me' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.78rem',
                      color: msg.sender === 'me' ? 'var(--cream)' : 'var(--cream-dim)',
                      lineHeight: 1.45,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}

          {/* ── LOADING ───────────────────────────────────────────── */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem 2rem' }}>
              <div style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '0.5rem',
              }}>
                {activeTab === 'upload' ? 'Reading screenshot…' : 'Reading the conversation…'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontWeight: 300 }}>
                Takes about 10–15 seconds.
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid var(--border-light)',
                borderTopColor: 'var(--amber)',
                animation: 'rc-spin 0.85s linear infinite',
                margin: '1.75rem auto 0',
              }} />
              <style>{`@keyframes rc-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── RESULTS ──────────────────────────────────────────── */}
          {step === 'results' && result && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.5rem', marginBottom: '1rem',
              }}>
                <div style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: '1.2rem', fontWeight: 500, color: 'var(--cream)',
                }}>
                  {result.replies.length} replies
                </div>
                <button
                  onClick={() => { setStep('form'); setResult(null); setExpanded(new Set()) }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--cream-dim)', cursor: 'pointer', fontSize: '0.8rem',
                    padding: '4px 0',
                  }}
                >
                  ← Try again
                </button>
              </div>

              {/* Vibe card */}
              <div style={{
                background: 'var(--amber-faint)',
                border: '1px solid var(--amber-dim)',
                borderRadius: 10, padding: '0.85rem 1rem',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: VIBE_DOT[result.vibe.engagement] ?? 'var(--cream-faint)',
                  }} />
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 500,
                    color: 'var(--amber)', letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {result.vibe.engagement}
                  </span>
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--cream)', lineHeight: 1.5 }}>
                  {result.vibe.user_facing_note}
                </div>
              </div>

              {/* Reply cards */}
              {result.replies.map(reply => {
                const isExpanded = expanded.has(reply.id)
                const isCopied = copiedId === reply.id
                return (
                  <div key={reply.id} style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 10, padding: '0.85rem 0.9rem',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      {reply.rank === 1 && (
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--amber)', color: 'var(--bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.55rem', fontWeight: 700, marginTop: 2,
                        }}>
                          ★
                        </div>
                      )}
                      <div style={{ fontSize: '0.92rem', color: 'var(--cream)', lineHeight: 1.5, flex: 1 }}>
                        {reply.content}
                      </div>
                    </div>

                    {reply.tone_tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {reply.tone_tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: '0.6rem', fontWeight: 500,
                            padding: '2px 7px', borderRadius: 4,
                            background: 'var(--amber-faint)', color: 'var(--amber)',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => toggleExpanded(reply.id)}
                        style={{
                          background: 'none', border: 'none',
                          color: isExpanded ? 'var(--amber)' : 'var(--cream-faint)',
                          cursor: 'pointer', fontSize: '0.72rem', padding: 0,
                          transition: 'color 0.15s',
                        }}
                      >
                        {isExpanded ? 'Hide reasoning' : 'Why it works'} ↕
                      </button>
                      <button
                        onClick={() => copyReply(reply)}
                        style={{
                          background: isCopied ? 'var(--amber-faint)' : 'var(--bg2)',
                          border: `1px solid ${isCopied ? 'var(--amber-dim)' : 'var(--border-light)'}`,
                          borderRadius: 6, padding: '4px 12px',
                          color: isCopied ? 'var(--amber)' : 'var(--cream-dim)',
                          cursor: 'pointer', fontSize: '0.72rem',
                          fontFamily: 'inherit', transition: 'all 0.2s',
                        }}
                      >
                        {isCopied ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>

                    {isExpanded && reply.reasoning && (
                      <div style={{
                        marginTop: 8, paddingTop: 8,
                        borderTop: '1px solid var(--border-light)',
                        fontSize: '0.78rem', color: 'var(--cream-dim)',
                        lineHeight: 1.6, fontWeight: 300,
                      }}>
                        {reply.reasoning}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* ── Sticky footer (form + confirming steps) ────────────── */}
        {(step === 'form' || step === 'confirming') && (
          <div style={{
            flexShrink: 0,
            padding: '0.65rem 1.25rem 1rem',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg2)',
          }}>
            {error && <div style={errorBoxStyle}>{error}</div>}

            {step === 'form' && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  style={{
                    width: '100%',
                    background: canGenerate ? 'var(--amber)' : 'var(--amber-dim)',
                    color: 'var(--bg)', border: 'none', borderRadius: 10,
                    padding: '0.9rem', fontFamily: 'inherit',
                    fontSize: '0.9rem', fontWeight: 500,
                    cursor: canGenerate ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                  }}
                >
                  Generate replies
                </button>
                {isFree && remaining !== null && (
                  <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--cream-faint)', marginTop: '0.5rem' }}>
                    {remaining} of 3 free replies left today
                  </p>
                )}
              </>
            )}

            {step === 'confirming' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setStep('form'); setParsedMessages(null); setError(null) }}
                  style={{
                    flex: 1, background: 'var(--bg3)', border: '1px solid var(--border-light)',
                    borderRadius: 10, padding: '0.78rem', fontFamily: 'inherit',
                    fontSize: '0.85rem', color: 'var(--cream-dim)', cursor: 'pointer',
                  }}
                >
                  ← Edit
                </button>
                <button
                  onClick={() => doGenerate(parsedMessages!)}
                  style={{
                    flex: 2, background: 'var(--amber)', color: 'var(--bg)',
                    border: 'none', borderRadius: 10, padding: '0.78rem',
                    fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Looks good →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
