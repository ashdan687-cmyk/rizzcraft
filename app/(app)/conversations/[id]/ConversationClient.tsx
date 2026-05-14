'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NewConversationSheet from '@/app/(app)/home/NewConversationSheet'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageRow = {
  id: string
  sender: 'me' | 'them'
  content: string
  order_index: number
}

export type ReplyRow = {
  id: string
  content: string
  tone_tags: string[]
  reasoning: string | null
  rank: number
  was_saved: boolean
  was_copied: boolean
}

export type GenerationRow = {
  id: string
  goal: string
  tone: string
  vibe_engagement: string | null
  vibe_user_note: string | null
  created_at: string
  error: string | null
  replies: ReplyRow[]
}

export type ConversationDetail = {
  id: string
  person_name: string | null
  platform: string | null
  context_notes: string | null
  created_at: string
  updated_at: string
  messages: MessageRow[]
  generations: GenerationRow[]
}

type Props = {
  conversation: ConversationDetail
  isFree: boolean
  remaining: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  reply: 'Reply', flirt: 'Flirt', ask_out: 'Ask out',
  revive: 'Revive', recover: 'Recover', open: 'Open',
}

const VIBE_DOT: Record<string, string> = {
  engaged: 'var(--green)',
  neutral: 'var(--amber)',
  cold: 'var(--cream-faint)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: MessageRow }) {
  const isMe = msg.sender === 'me'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      marginBottom: 6,
    }}>
      <div style={{
        maxWidth: '78%',
        background: isMe ? 'var(--amber-faint)' : 'var(--bg3)',
        border: `1px solid ${isMe ? 'var(--border-amber)' : 'var(--border-light)'}`,
        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '0.55rem 0.75rem',
        fontSize: '0.84rem',
        color: isMe ? 'var(--cream)' : 'var(--cream-dim)',
        lineHeight: 1.5,
        fontWeight: isMe ? 400 : 300,
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConversationClient({ conversation, isFree, remaining: initialRemaining }: Props) {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(
      conversation.generations
        .flatMap(g => g.replies)
        .filter(r => r.was_saved)
        .map(r => r.id),
    ),
  )
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [remaining, setRemaining] = useState(initialRemaining)

  const sortedMessages = [...conversation.messages].sort((a, b) => a.order_index - b.order_index)
  const sortedGenerations = [...conversation.generations]
    .filter(g => !g.error)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const headerLabel = [conversation.person_name, conversation.platform]
    .filter(Boolean).join(' · ') || 'Conversation'

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCopy(reply: ReplyRow) {
    try {
      await navigator.clipboard.writeText(reply.content)
      setCopiedId(reply.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard API unavailable
    }
    // Fire-and-forget — don't block UI on this
    fetch(`/api/replies/${reply.id}/copied`, { method: 'POST' }).catch(() => {})
  }

  async function handleSave(replyId: string) {
    // Optimistic toggle
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(replyId) ? next.delete(replyId) : next.add(replyId)
      return next
    })
    try {
      const res = await fetch(`/api/replies/${replyId}/save`, { method: 'POST' })
      const data = await res.json()
      // Sync with server truth
      setSavedIds(prev => {
        const next = new Set(prev)
        data.was_saved ? next.add(replyId) : next.delete(replyId)
        return next
      })
    } catch {
      // Revert on network error
      setSavedIds(prev => {
        const next = new Set(prev)
        next.has(replyId) ? next.delete(replyId) : next.add(replyId)
        return next
      })
    }
  }

  function handleSheetClose() {
    setIsSheetOpen(false)
    router.refresh()
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ padding: '1rem 1.1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <Link href="/home" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--bg3)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cream-dim)', fontSize: '0.85rem', textDecoration: 'none',
          }}>
            ←
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.92rem', fontWeight: 500, color: 'var(--cream)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {headerLabel}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--cream-faint)', marginTop: 1 }}>
              {formatTime(conversation.updated_at)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages thread ─────────────────────────────────────────── */}
      <div style={{ padding: '0 1.1rem 1.25rem' }}>
        <div style={{
          fontSize: '0.58rem', fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--cream-faint)', marginBottom: '0.75rem',
        }}>
          The conversation
        </div>
        {sortedMessages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div style={{
        margin: '0 1.1rem 1.25rem',
        borderTop: '1px solid var(--border-light)',
      }} />

      {/* ── Generations ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 1.1rem' }}>
        {sortedGenerations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--cream-dim)', fontSize: '0.82rem' }}>
            No generations yet.
          </div>
        ) : (
          sortedGenerations.map((gen, genIdx) => {
            const sortedReplies = [...gen.replies].sort((a, b) => a.rank - b.rank)
            const goalLabel = GOAL_LABELS[gen.goal] ?? gen.goal

            return (
              <div key={gen.id} style={{ marginBottom: '1.5rem' }}>
                {/* Generation label */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '0.6rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {gen.vibe_engagement && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: VIBE_DOT[gen.vibe_engagement] ?? 'var(--cream-faint)',
                      }} />
                    )}
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 500,
                      color: 'var(--cream-dim)', letterSpacing: '0.04em',
                    }}>
                      {capitalize(gen.tone)} · {goalLabel}
                      {gen.vibe_engagement ? ` · ${gen.vibe_engagement}` : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--cream-faint)' }}>
                    {genIdx === 0 ? 'Latest' : formatTime(gen.created_at)}
                  </span>
                </div>

                {/* Vibe note */}
                {gen.vibe_user_note && (
                  <div style={{
                    background: 'var(--amber-faint)', border: '1px solid var(--amber-dim)',
                    borderRadius: 8, padding: '0.65rem 0.85rem', marginBottom: '0.6rem',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cream)', lineHeight: 1.5, fontWeight: 300 }}>
                      {gen.vibe_user_note}
                    </div>
                  </div>
                )}

                {/* Reply cards */}
                {sortedReplies.map(reply => {
                  const isCopied = copiedId === reply.id
                  const isSaved = savedIds.has(reply.id)
                  const isExpanded = expandedIds.has(reply.id)

                  return (
                    <div key={reply.id} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border-light)',
                      borderRadius: 10, padding: '0.85rem 0.9rem', marginBottom: 8,
                    }}>
                      {/* Content */}
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

                      {/* Tone tags */}
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

                      {/* Actions row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Why it works */}
                        <button
                          onClick={() => toggleExpanded(reply.id)}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            color: isExpanded ? 'var(--amber)' : 'var(--cream-faint)',
                            cursor: 'pointer', fontSize: '0.72rem', flex: 1, textAlign: 'left',
                            transition: 'color 0.15s',
                          }}
                        >
                          {isExpanded ? 'Hide' : 'Why it works'} ↕
                        </button>

                        {/* Save heart */}
                        <button
                          onClick={() => handleSave(reply.id)}
                          style={{
                            background: 'none', border: 'none', padding: '4px 6px',
                            cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1,
                            color: isSaved ? 'var(--amber)' : 'var(--cream-faint)',
                            transition: 'color 0.2s',
                          }}
                          title={isSaved ? 'Unsave' : 'Save'}
                        >
                          {isSaved ? '♥' : '♡'}
                        </button>

                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(reply)}
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

                      {/* Reasoning */}
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
              </div>
            )
          })
        )}
      </div>

      {/* Spacer so content isn't behind sticky bar + bottom tabs */}
      <div style={{ height: 140 }} />

      {/* ── Sticky "Generate more" bar ───────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 64, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390,
        padding: '0.5rem 1.1rem 0.75rem',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        zIndex: 40,
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => setIsSheetOpen(true)}
          style={{
            width: '100%', pointerEvents: 'auto',
            background: 'var(--amber)', color: 'var(--bg)',
            border: 'none', borderRadius: 12, padding: '0.9rem',
            fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
          Generate more replies
        </button>
      </div>

      {/* ── Sheet ────────────────────────────────────────────────────── */}
      <NewConversationSheet
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
        isFree={isFree}
        remaining={remaining}
        onGenerated={setRemaining}
        prefillMessages={sortedMessages.map(m => ({
          sender: m.sender,
          content: m.content,
          order_index: m.order_index,
        }))}
        existingConversationId={conversation.id}
      />
    </>
  )
}
