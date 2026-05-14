'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        width: '100%', padding: '0.85rem 1rem',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 6, background: 'var(--bg4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.82rem', color: 'var(--red)', flexShrink: 0,
      }}>
        ↗
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--red)', fontWeight: 400 }}>Sign out</div>
    </button>
  )
}
