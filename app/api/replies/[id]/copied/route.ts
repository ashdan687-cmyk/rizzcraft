import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: replyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json(
      { error: { code: 'unauthorized', message: 'Must be signed in.' } },
      { status: 401 },
    )
  }

  const { data: reply, error } = await supabase
    .from('replies')
    .update({ was_copied: true })
    .eq('id', replyId)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (error || !reply) {
    return Response.json(
      { error: { code: 'not_found', message: 'Reply not found.' } },
      { status: 404 },
    )
  }

  return Response.json({ ok: true })
}
