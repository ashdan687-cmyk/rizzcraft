'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NewConversationSheet from './NewConversationSheet'

// ── Constants ─────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 14 // ≈ 87.96

const GOAL_LABELS: Record<string, string> = {
  reply: 'Reply',
  flirt: 'Flirt',
  ask_out: 'Ask out',
  revive: 'Revive',
  recover: 'Recover',
  open: 'Open',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConversationRow = {
  id: string
  person_name: string | null
  platform: string | null
  created_at: string
  messages: { content: string; sender: string; order_index: number }[]
  generations: { goal: string; tone: string }[]
}

type Props = {
  firstName: string
  isFree: boolean
  remaining: number | null
  conversations: ConversationRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeScreen({ firstName, isFree, remaining: initialRemaining, conversations }: Props) {
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [remaining, setRemaining] = useState(initialRemaining)

  function handleSheetClose() {
    setIsSheetOpen(false)
    router.refresh()
  }

  const ringFill = isFree && remaining !== null
    ? Math.max(0, (remaining / 3) * CIRCUMFERENCE)
    : CIRCUMFERENCE
  const ringDash = `${ringFill.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`

  return (
    <>
      <div style={{ padding: '1.25rem 1.1rem 0' }}>

        {/* Greeting */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: '1.25rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1.4rem', fontWeight: 500, lineHeight: 1.15,
          }}>
            Hey<br />
            <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>
              {firstName}.
            </em>
          </div>
          <Link href="/settings" style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--bg3)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cream-dim)', fontSize: '0.85rem',
            textDecoration: 'none', marginTop: 4, flexShrink: 0,
          }}>
            ⊙
          </Link>
        </div>

        {/* Usage card */}
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border-light)',
          borderRadius: 12, padding: '0.9rem 1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--amber-faint)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke="var(--amber)" strokeWidth="3"
              strokeDasharray={ringDash}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div style={{ flex: 1 }}>
            {isFree ? (
              <>
                <div style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: '1.05rem', fontWeight: 500, lineHeight: 1,
                }}>
                  {remaining ?? 0}{' '}
                  <span style={{ color: 'var(--cream-dim)', fontSize: '0.78rem' }}>
                    of 3 replies left today
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--cream-dim)', fontWeight: 300, marginTop: 3 }}>
                  Resets at midnight
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: '1.05rem', fontWeight: 500, lineHeight: 1,
                }}>
                  Pro{' '}
                  <span style={{ color: 'var(--cream-dim)', fontSize: '0.78rem' }}>
                    unlimited replies
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--cream-dim)', fontWeight: 300, marginTop: 3 }}>
                  You&apos;re on Pro
                </div>
              </>
            )}
          </div>
          {isFree && (
            <span style={{ fontSize: '0.7rem', color: 'var(--amber)', fontWeight: 500 }}>
              Go Pro →
            </span>
          )}
        </div>

        {/* New conversation CTA */}
        <button
          onClick={() => setIsSheetOpen(true)}
          style={{
            width: '100%', background: 'var(--amber)', color: 'var(--bg)',
            border: 'none', borderRadius: 12, padding: '1rem',
            fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, marginBottom: '1.25rem',
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
          New conversation
        </button>

        {/* Recent label */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.6rem', fontSize: '0.62rem', fontWeight: 500,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cream-faint)',
        }}>
          <span>Recent</span>
          <Link href="/history" style={{ color: 'var(--amber)', textDecoration: 'none', fontSize: '0.62rem' }}>
            See all →
          </Link>
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ padding: '0 1.1rem 1.5rem' }}>
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ fontSize: '1.8rem', color: 'var(--cream-faint)', marginBottom: '0.6rem' }}>◐</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--cream)', marginBottom: '0.3rem' }}>
              No conversations yet
            </div>
            <div style={{
              fontSize: '0.75rem', color: 'var(--cream-dim)', fontWeight: 300,
              lineHeight: 1.55, maxWidth: '28ch', margin: '0 auto',
            }}>
              Hit &ldquo;New conversation&rdquo; to get your first reply suggestion.
            </div>
          </div>
        ) : (
          conversations.map(convo => {
            const sorted = [...(convo.messages ?? [])].sort((a, b) => a.order_index - b.order_index)
            const lastMsg = sorted[sorted.length - 1]
            const gen = convo.generations?.[0]
            const goalLabel = gen?.goal ? (GOAL_LABELS[gen.goal] ?? gen.goal) : null
            const nameLabel = [convo.person_name, convo.platform].filter(Boolean).join(' · ') || 'Conversation'

            return (
              <Link key={convo.id} href={`/conversations/${convo.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  background: 'var(--bg3)', border: '1px solid var(--border-light)',
                  borderRadius: 10, padding: '0.75rem 0.9rem', marginBottom: 7,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--cream)' }}>
                      {nameLabel}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--cream-faint)', flexShrink: 0, marginLeft: 8 }}>
                      {timeAgo(convo.created_at)}
                    </div>
                  </div>
                  {lastMsg && (
                    <div className="line-clamp-1" style={{
                      fontSize: '0.72rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.4,
                    }}>
                      &ldquo;{lastMsg.content}&rdquo;
                    </div>
                  )}
                  {goalLabel && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 500,
                        padding: '2px 6px', borderRadius: 4,
                        background: 'var(--amber-faint)', color: 'var(--amber)',
                      }}>
                        {goalLabel}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>

      <NewConversationSheet
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
        isFree={isFree}
        remaining={remaining}
        onGenerated={setRemaining}
      />
    </>
  )
}
