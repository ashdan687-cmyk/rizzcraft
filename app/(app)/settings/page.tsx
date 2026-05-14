import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from './SignOutButton'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'trial'
  const emailLocal = user.email?.split('@')[0] ?? ''
  const firstName = emailLocal
    .split(/[._\-+]/)
    .filter(Boolean)[0]
    ?.replace(/^\w/, c => c.toUpperCase()) || 'there'

  return (
    <div style={{ padding: '1.25rem 1.1rem' }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontSize: '1.4rem', fontWeight: 500, lineHeight: 1.15, marginBottom: '1.25rem',
      }}>
        Settings
      </div>

      {/* Profile card */}
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border-light)',
        borderRadius: 10, padding: '1.1rem', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', background: 'var(--amber-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '1.3rem', color: 'var(--cream)', flexShrink: 0,
        }}>
          {firstName[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--cream)' }}>{firstName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: 2 }}>{user.email}</div>
        </div>
      </div>

      {/* Account section */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--cream-faint)', marginBottom: '0.4rem',
        }}>
          Account
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
          {!isPro && (
            <SettingsRow icon="★" label="Upgrade to Pro" value="Unlimited replies + every feature" isPro />
          )}
          <SettingsRow icon="◐" label="Texting style" value="Help us sound like you" />
          <SettingsRow icon="✎" label="Edit profile" isLast />
        </div>
      </div>

      {/* App section */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--cream-faint)', marginBottom: '0.4rem',
        }}>
          App
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
          <SettingsRow icon="◔" label="Notifications" value="On" />
          <SettingsRow icon="⊙" label="Privacy" value="Chats never stored" />
          <SettingsRow icon="?" label="Help & support" isLast />
        </div>
      </div>

      {/* Sign out */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
        <SignOutButton />
      </div>
    </div>
  )
}

function SettingsRow({ icon, label, value, isPro, isLast }: {
  icon: string
  label: string
  value?: string
  isPro?: boolean
  isLast?: boolean
}) {
  return (
    <div style={{
      padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
      background: isPro ? 'linear-gradient(135deg, var(--amber-faint), var(--bg3))' : undefined,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: isPro ? 'var(--amber-dim)' : 'var(--bg4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.82rem', color: isPro ? 'var(--cream)' : 'var(--cream-dim)', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 400 }}>{label}</div>
        {value && <div style={{ fontSize: '0.7rem', color: 'var(--cream-faint)', marginTop: 1 }}>{value}</div>}
      </div>
      <div style={{ color: 'var(--cream-faint)', fontSize: '0.85rem' }}>›</div>
    </div>
  )
}
