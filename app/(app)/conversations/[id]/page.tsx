import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConversationClient, { type ConversationDetail } from './ConversationClient'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: conversation }, { data: profile }] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        id,
        person_name,
        platform,
        context_notes,
        created_at,
        updated_at,
        messages(id, sender, content, order_index),
        generations(
          id, goal, tone, vibe_engagement, vibe_user_note, created_at, error,
          replies(id, content, tone_tags, reasoning, rank, was_saved, was_copied)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('subscription_status, daily_reply_count, daily_reply_reset_at')
      .eq('id', user.id)
      .single(),
  ])

  if (!conversation) notFound()

  const isFree = !profile || profile.subscription_status === 'free'
  let remaining: number | null = null
  if (isFree && profile) {
    const resetAt = profile.daily_reply_reset_at ? new Date(profile.daily_reply_reset_at) : null
    const effectiveCount = resetAt && new Date() > resetAt ? 0 : (profile.daily_reply_count ?? 0)
    remaining = Math.max(0, 3 - effectiveCount)
  }

  return (
    <ConversationClient
      conversation={conversation as unknown as ConversationDetail}
      isFree={isFree}
      remaining={remaining}
    />
  )
}
