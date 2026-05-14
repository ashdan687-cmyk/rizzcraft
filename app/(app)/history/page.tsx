import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient, { type ConversationSummary } from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: raw } = await supabase
    .from('conversations')
    .select(`
      id,
      person_name,
      platform,
      created_at,
      generations(
        id,
        goal,
        tone,
        vibe_engagement,
        created_at,
        error,
        replies(id, content, rank, outcome, was_saved)
      )
    `)
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  type RawReply = { id: string; content: string; rank: number; outcome: string | null; was_saved: boolean }
  type RawGen = { id: string; goal: string; tone: string; vibe_engagement: string | null; created_at: string; error: string | null; replies: RawReply[] }
  type RawConvo = { id: string; person_name: string | null; platform: string | null; created_at: string; generations: RawGen[] }

  const conversations: ConversationSummary[] = (raw ?? []).map((c: unknown) => {
    const convo = c as RawConvo
    const validGens = (convo.generations ?? []).filter(g => !g.error)
    const latestGen = validGens.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
    const topReply = latestGen
      ? [...(latestGen.replies ?? [])].sort((a, b) => a.rank - b.rank)[0] ?? null
      : null
    const hasSaved = (convo.generations ?? [])
      .flatMap(g => g.replies ?? [])
      .some(r => r.was_saved)

    return {
      id: convo.id,
      person_name: convo.person_name,
      platform: convo.platform,
      created_at: convo.created_at,
      latestGoal: latestGen?.goal ?? null,
      latestTone: latestGen?.tone ?? null,
      latestVibeEngagement: latestGen?.vibe_engagement ?? null,
      topReplyContent: topReply?.content ?? null,
      topReplyOutcome: topReply?.outcome ?? null,
      hasSaved,
    }
  })

  return <HistoryClient conversations={conversations} />
}
