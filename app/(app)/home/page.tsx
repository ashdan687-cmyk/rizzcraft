import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeScreen, { type ConversationRow } from './HomeScreen'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: profile }, { data: conversations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_status, daily_reply_count, daily_reply_reset_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('conversations')
      .select(`
        id,
        person_name,
        platform,
        created_at,
        messages(content, sender, order_index),
        generations(goal, tone)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const isFree = !profile || profile.subscription_status === 'free'

  let remaining: number | null = null
  if (isFree && profile) {
    const resetAt = profile.daily_reply_reset_at ? new Date(profile.daily_reply_reset_at) : null
    const effectiveCount = resetAt && new Date() > resetAt ? 0 : (profile.daily_reply_count ?? 0)
    remaining = Math.max(0, 3 - effectiveCount)
  }

  // Derive first name from email — no display_name column in schema
  const emailLocal = user.email?.split('@')[0] ?? ''
  const firstName = emailLocal
    .split(/[._\-+]/)
    .filter(Boolean)[0]
    ?.replace(/^\w/, c => c.toUpperCase()) || 'there'

  return (
    <HomeScreen
      firstName={firstName}
      isFree={isFree}
      remaining={remaining}
      conversations={(conversations ?? []) as ConversationRow[]}
    />
  )
}
