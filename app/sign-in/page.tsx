'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const emailValid = useMemo(() => isValidEmail(email), [email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValid) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/sign-in/callback`,
        },
      })

      if (error) throw error

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValid || !password) return
    setPasswordLoading(true)
    setError(null)

    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/home')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,156,67,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '1.6rem',
          fontWeight: 500,
          color: 'var(--cream)',
          letterSpacing: '-0.005em',
          marginBottom: '3rem',
          textAlign: 'center',
        }}>
          Rizz<span style={{ color: 'var(--amber)' }}>Craft</span>
        </div>

        {!sent ? (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--amber)',
                marginBottom: '0.75rem',
              }}>
                Sign in
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                fontWeight: 500,
                lineHeight: 1.1,
                color: 'var(--cream)',
                marginBottom: '0.75rem',
              }}>
                Text like the version of you<br />
                that <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>always knows</em> what to say.
              </h1>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--cream-dim)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}>
                Enter your email and we&rsquo;ll send you a magic link. No password needed.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    color: 'var(--cream)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber-dim)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
                />
              </div>

              {error && (
                <p style={{
                  fontSize: '0.82rem',
                  color: '#e07070',
                  marginBottom: '0.75rem',
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!emailValid}
                style={{
                  width: '100%',
                  background: 'var(--amber)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: emailValid ? 'pointer' : 'not-allowed',
                  opacity: emailValid ? 1 : 0.65,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? 'Sending…' : 'Send me a magic link'}
              </button>
            </form>

            <p style={{
              marginTop: '1.5rem',
              fontSize: '0.78rem',
              color: 'var(--cream-dim)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              No account? Just enter your email — we&rsquo;ll create one for you.
            </p>

            {/* Password sign-in toggle */}
            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setShowPassword(v => !v); setError(null) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--amber)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                  opacity: 0.8,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.8' }}
              >
                {showPassword ? 'Use magic link instead' : 'Have a password? Sign in here'}
              </button>
            </div>

            {/* Expandable password section */}
            <div style={{
              overflow: 'hidden',
              maxHeight: showPassword ? '200px' : '0',
              transition: 'max-height 0.3s ease',
            }}>
              <form onSubmit={handlePasswordSignIn} style={{ paddingTop: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      color: 'var(--cream)',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber-dim)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!emailValid || !password}
                  style={{
                    width: '100%',
                    background: 'var(--amber)',
                    color: 'var(--bg)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: emailValid && password ? 'pointer' : 'not-allowed',
                    opacity: emailValid && password ? 1 : 0.65,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {passwordLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.4rem',
            }}>
              ✉
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: '1.6rem',
              fontWeight: 500,
              color: 'var(--cream)',
              marginBottom: '0.75rem',
            }}>
              Check your email
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--cream-dim)',
              fontWeight: 300,
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              We sent a magic link to <strong style={{ color: 'var(--cream)', fontWeight: 500 }}>{email}</strong>.<br />
              Click it to sign in. It&rsquo;s good for one use.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cream-dim)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'var(--border)',
                padding: 0,
              }}
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
