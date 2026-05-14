'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConversationSummary = {
  id: string
  person_name: string | null
  platform: string | null
  created_at: string
  latestGoal: string | null
  latestTone: string | null
  latestVibeEngagement: string | null
  topReplyContent: string | null
  topReplyOutcome: string | null
  hasSaved: boolean
}

type FilterKey = 'all' | 'got_reply' | 'awaiting' | 'saved' | 'cold'

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'got_reply', label: 'Got a reply' },
  { key: 'awaiting',  label: 'Awaiting' },
  { key: 'saved',     label: 'Saved' },
  { key: 'cold',      label: 'Cold chats' },
]

const GOAL_LABELS: Record<string, string> = {
  reply: 'Reply', flirt: 'Flirt', ask_out: 'Ask out',
  revive: 'Revive', recover: 'Recover', open: 'Open',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type DateGroup = 'today' | 'yesterday' | 'this_week' | 'earlier'

function getDateGroup(dateStr: string): DateGroup {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)
  const d = new Date(dateStr)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (dDay >= today) return 'today'
  if (dDay >= yesterday) return 'yesterday'
  if (dDay >= weekAgo) return 'this_week'
  return 'earlier'
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today:     'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  earlier:   'Earlier',
}

const GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'this_week', 'earlier']

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function applyFilter(convos: ConversationSummary[], filter: FilterKey): ConversationSummary[] {
  switch (filter) {
    case 'got_reply': return convos.filter(c => c.topReplyOutcome === 'got_reply')
    case 'awaiting':  return convos.filter(c => c.topReplyOutcome === null)
    case 'saved':     return convos.filter(c => c.hasSaved)
    case 'cold':      return convos.filter(c => c.latestVibeEngagement === 'cold')
    default:          return convos
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OutcomeTag({ outcome }: { outcome: string | null }) {
  if (outcome === 'got_reply') {
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 500, padding: '2px 6px', borderRadius: 4,
        background: 'rgba(76,175,121,0.15)', color: 'var(--green)',
      }}>
        Got a reply
      </span>
    )
  }
  if (outcome === 'no_reply') {
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 500, padding: '2px 6px', borderRadius: 4,
        background: 'rgba(212,83,58,0.12)', color: '#e07d6a',
      }}>
        No reply
      </span>
    )
  }
  if (outcome === 'sent_no_response_yet') {
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 500, padding: '2px 6px', borderRadius: 4,
        background: 'var(--amber-faint)', color: 'var(--amber)',
      }}>
        Awaiting reply
      </span>
    )
  }
  return null
}

function GoalTag({ goal }: { goal: string | null }) {
  if (!goal) return null
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 500, padding: '2px 6px', borderRadius: 4,
      background: 'var(--amber-faint)', color: 'var(--amber)',
    }}>
      {GOAL_LABELS[goal] ?? goal}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HistoryClient({ conversations }: { conversations: ConversationSummary[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filtered = applyFilter(conversations, activeFilter)

  // Group into date buckets
  const grouped: Partial<Record<DateGroup, ConversationSummary[]>> = {}
  for (const convo of filtered) {
    const group = getDateGroup(convo.created_at)
    if (!grouped[group]) grouped[group] = []
    grouped[group]!.push(convo)
  }

  return (
    <div style={{ padding: '1.25rem 1.1rem 1.5rem' }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontSize: '1.4rem', fontWeight: 500, lineHeight: 1.15, marginBottom: '1.25rem',
      }}>
        Your<br />
        <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>history.</em>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: '1rem',
        overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              fontSize: '0.7rem', padding: '5px 11px', borderRadius: 20,
              background: activeFilter === f.key ? 'var(--amber)' : 'var(--bg3)',
              border: `1px solid ${activeFilter === f.key ? 'var(--amber)' : 'var(--border-light)'}`,
              color: activeFilter === f.key ? 'var(--bg)' : 'var(--cream-dim)',
              fontWeight: activeFilter === f.key ? 500 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '1.8rem', color: 'var(--cream-faint)', marginBottom: '0.6rem' }}>≡</div>
          <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--cream)', marginBottom: '0.3rem' }}>
            {activeFilter === 'all' ? 'No conversations yet' : 'Nothing here'}
          </div>
          <div style={{
            fontSize: '0.75rem', color: 'var(--cream-dim)', fontWeight: 300,
            lineHeight: 1.55, maxWidth: '28ch', margin: '0 auto',
          }}>
            {activeFilter === 'all'
              ? 'Start a new conversation from the home screen.'
              : 'Try a different filter.'}
          </div>
        </div>
      )}

      {/* Grouped conversation list */}
      {GROUP_ORDER.map(group => {
        const items = grouped[group]
        if (!items?.length) return null
        return (
          <div key={group}>
            {/* Date section header */}
            <div style={{
              fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--cream-faint)',
              margin: '0.9rem 0 0.5rem',
            }}>
              {GROUP_LABELS[group]}
            </div>

            {items.map(convo => {
              const nameLabel = [convo.person_name, convo.platform]
                .filter(Boolean).join(' · ') || 'Conversation'

              return (
                <Link key={convo.id} href={`/conversations/${convo.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    background: 'var(--bg3)', border: '1px solid var(--border-light)',
                    borderRadius: 10, padding: '0.75rem 0.9rem', marginBottom: 7,
                  }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--cream)' }}>
                        {nameLabel}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--cream-faint)', flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(convo.created_at)}
                      </div>
                    </div>

                    {/* Top reply preview */}
                    {convo.topReplyContent && (
                      <div className="line-clamp-1" style={{
                        fontSize: '0.72rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.4,
                      }}>
                        &ldquo;{convo.topReplyContent}&rdquo;
                      </div>
                    )}

                    {/* Tags row */}
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <OutcomeTag outcome={convo.topReplyOutcome} />
                      <GoalTag goal={convo.latestGoal} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
