import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  // Fetch current state, verify ownership
  const { data: reply } = await supabase
    .from('replies')
    .select('id, was_saved, generation_id, user_id')
    .eq('id', replyId)
    .eq('user_id', user.id)
    .single()

  if (!reply) {
    return Response.json(
      { error: { code: 'not_found', message: 'Reply not found.' } },
      { status: 404 },
    )
  }

  const { data: updated } = await supabase
    .from('replies')
    .update({ was_saved: !reply.was_saved })
    .eq('id', replyId)
    .select('was_saved')
    .single()

  // Revalidate the conversation page so saved state reflects on next hard load
  const { data: generation } = await supabase
    .from('generations')
    .select('conversation_id')
    .eq('id', reply.generation_id)
    .single()

  if (generation) {
    revalidatePath(`/conversations/${generation.conversation_id}`)
  }

  return Response.json({ was_saved: updated?.was_saved ?? !reply.was_saved })
}
