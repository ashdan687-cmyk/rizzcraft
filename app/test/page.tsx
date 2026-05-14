'use client'

import { useState } from 'react'

const SAMPLE_CONVERSATION = `them: haha ok you clearly haven't tried the jollof at that place on Kimathi
me: haha yeah maybe
them: no seriously, you're missing out. it's a vibe`

const GOALS = ['reply', 'flirt', 'ask_out', 'revive', 'recover', 'open'] as const
const TONES = ['casual', 'witty', 'charming', 'bold', 'romantic'] as const

export default function TestPage() {
  const [conversation, setConversation] = useState(SAMPLE_CONVERSATION)
  const [goal, setGoal] = useState<string>('ask_out')
  const [tone, setTone] = useState<string>('casual')
  const [contextNotes, setContextNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  function parseConversation(text: string) {
    const lines = text.trim().split('\n').filter(Boolean)
    return lines.map((line, i) => {
      const match = line.match(/^(me|them):\s*(.+)$/i)
      if (!match) return null
      return {
        sender: match[1].toLowerCase() as 'me' | 'them',
        content: match[2],
        order_index: i + 1,
      }
    }).filter(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    const messages = parseConversation(conversation)
    if (messages.length === 0) {
      setError('Could not parse conversation. Format each line as "me: ..." or "them: ..."')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, goal, tone, context_notes: contextNotes || undefined }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>/api/generate test</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Each line must be <code>me: ...</code> or <code>them: ...</code>
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Conversation
          </label>
          <textarea
            value={conversation}
            onChange={e => setConversation(e.target.value)}
            rows={8}
            style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Goal</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={{ padding: '0.4rem' }}>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={{ padding: '0.4rem' }}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Context notes (optional)
          </label>
          <input
            type="text"
            value={contextNotes}
            onChange={e => setContextNotes(e.target.value)}
            placeholder="e.g. Met at a party last weekend"
            style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 1.5rem', cursor: loading ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: 'none' }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '1.5rem', color: 'red', background: '#fff0f0', padding: '0.75rem', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Response</h2>
          <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto', fontSize: '0.8rem', borderRadius: '4px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
