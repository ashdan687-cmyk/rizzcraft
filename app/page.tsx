import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'RizzCraft — Text like the version of you that always knows what to say',
  description: 'AI-powered texting copilot for dating conversations. Paste a chat, pick your goal, get 3–5 replies that sound like you — just sharper.',
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeLeft {
          from { opacity: 0; transform: translateY(-50%) translateX(30px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }

        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 2.5rem;
          background: rgba(13,12,11,0.88); backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-light);
        }
        .lp-nav-links {
          display: flex; gap: 2rem; align-items: center;
        }
        .lp-nav-link {
          font-size: 0.85rem; color: var(--cream-dim); text-decoration: none;
          letter-spacing: 0.04em; text-transform: uppercase; transition: color 0.2s;
        }
        .lp-nav-link:hover { color: var(--cream); }
        .lp-nav-cta {
          font-size: 0.85rem; color: var(--bg); background: var(--amber);
          padding: 0.5rem 1.25rem; border-radius: 4px;
          text-decoration: none; font-weight: 500; letter-spacing: 0;
          text-transform: none; transition: background 0.2s;
        }
        .lp-nav-cta:hover { background: var(--amber-light); }

        .lp-hero {
          min-height: 100vh; display: flex; flex-direction: column;
          justify-content: center; padding: 8rem 2.5rem 5rem;
          position: relative; overflow: hidden;
        }
        .lp-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 70% 50%, rgba(212,156,67,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-chat-demo {
          position: absolute; right: 5%; top: 50%; transform: translateY(-50%);
          width: min(340px, 38vw);
          opacity: 0; animation: fadeLeft 0.8s 0.6s forwards;
        }

        .lp-steps {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1px; background: var(--border-light);
          border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;
        }
        .lp-step { background: var(--bg2); padding: 2rem 1.75rem; transition: background 0.2s; }
        .lp-step:hover { background: var(--bg3); }

        .lp-features-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem; margin-top: 3rem;
        }
        .lp-feature-card {
          background: var(--bg2); border: 1px solid var(--border-light);
          border-radius: 8px; padding: 1.75rem;
          transition: border-color 0.25s, background 0.25s;
        }
        .lp-feature-card:hover { border-color: var(--amber-dim); background: var(--bg3); }

        .lp-vibe-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
        }

        .lp-pricing-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem; margin-top: 3rem; max-width: 860px;
        }

        .lp-btn-primary {
          display: inline-block; background: var(--amber); color: var(--bg);
          font-size: 0.95rem; font-weight: 500;
          padding: 0.85rem 2rem; border-radius: 4px; text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .lp-btn-primary:hover { background: var(--amber-light); transform: translateY(-1px); }

        .lp-pricing-card-ghost {
          display: block; width: 100%; padding: 0.8rem; border-radius: 4px;
          font-size: 0.9rem; font-weight: 500; text-align: center; text-decoration: none;
          background: transparent; color: var(--cream-dim);
          border: 1px solid var(--border-light);
          transition: border-color 0.2s, color 0.2s;
        }
        .lp-pricing-card-ghost:hover { border-color: var(--cream-dim); color: var(--cream); }

        .lp-pricing-card-cta {
          display: block; width: 100%; padding: 0.8rem; border-radius: 4px;
          font-size: 0.9rem; font-weight: 500; text-align: center; text-decoration: none;
          background: var(--amber); color: var(--bg);
          transition: background 0.2s;
        }
        .lp-pricing-card-cta:hover { background: var(--amber-light); }

        @media (max-width: 768px) {
          .lp-nav { padding: 1rem 1.25rem; }
          .lp-nav-links { display: none; }
          .lp-hero { padding: 7rem 1.25rem 3rem; }
          .lp-chat-demo { display: none; }
          .lp-section { padding: 4rem 1.25rem !important; }
          .lp-stats { padding: 1.5rem 1.25rem !important; }
          .lp-vibe-grid { grid-template-columns: 1fr; gap: 2rem; }
          footer { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav">
        <Link href="/" style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '1.4rem', fontWeight: 500,
          color: 'var(--cream)', letterSpacing: '-0.005em',
          textDecoration: 'none',
        }}>
          Rizz<span style={{ color: 'var(--amber)' }}>Craft</span>
        </Link>
        <div className="lp-nav-links">
          <a href="#how" className="lp-nav-link">How it works</a>
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#pricing" className="lp-nav-link">Pricing</a>
          <Link href="/sign-in" className="lp-nav-cta">Try free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <p style={{
          fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1.5rem',
          opacity: 0, animation: 'fadeUp 0.7s 0.1s forwards',
        }}>
          The texting copilot
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 500,
          lineHeight: 1.05, maxWidth: '14ch', marginBottom: '1.5rem',
          opacity: 0, animation: 'fadeUp 0.7s 0.2s forwards',
        }}>
          Text like the version of you that{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>always knows</em>{' '}
          what to say.
        </h1>
        <p style={{
          fontSize: '1.1rem', fontWeight: 300, color: 'var(--cream-dim)',
          maxWidth: '46ch', lineHeight: 1.7, marginBottom: '2.5rem',
          opacity: 0, animation: 'fadeUp 0.7s 0.3s forwards',
        }}>
          Paste a conversation. RizzCraft reads the room and gives you 3–5 replies that sound like you — just sharper, wittier, and more natural.
        </p>
        <div style={{
          display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
          opacity: 0, animation: 'fadeUp 0.7s 0.4s forwards',
        }}>
          <Link href="/sign-in" className="lp-btn-primary">
            Try it free — no sign-up needed
          </Link>
          <a href="#how" style={{
            display: 'inline-block', color: 'var(--cream-dim)', fontSize: '0.9rem',
            fontWeight: 400, textDecoration: 'none',
            borderBottom: '1px solid rgba(212,156,67,0.15)', paddingBottom: '2px',
            transition: 'color 0.2s, border-color 0.2s',
          }}>
            See how it works
          </a>
        </div>
        <p style={{
          fontSize: '0.78rem', color: 'var(--cream-dim)', marginTop: '1rem',
          opacity: 0, animation: 'fadeUp 0.7s 0.5s forwards',
        }}>
          3 free replies per day. No credit card.
        </p>

        {/* Chat demo phone mockup */}
        <div className="lp-chat-demo">
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border-light)',
            borderRadius: '24px', padding: '1.5rem 1rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '0.75rem', color: 'var(--cream-dim)',
              marginBottom: '1rem', paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf79', display: 'inline-block' }} />
              Reading the vibe...
            </div>
            <div style={{ display: 'flex', margin: '6px 0', justifyContent: 'flex-start' }}>
              <div style={{
                maxWidth: '78%', fontSize: '0.82rem', lineHeight: 1.45, padding: '0.55rem 0.85rem',
                background: 'var(--bg3)', color: 'var(--cream-dim)',
                borderRadius: '16px 16px 16px 4px',
              }}>
                haha ok you clearly haven&rsquo;t tried the jollof at that place on Kimathi
              </div>
            </div>
            <div style={{ display: 'flex', margin: '6px 0', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '78%', fontSize: '0.82rem', lineHeight: 1.45, padding: '0.55rem 0.85rem',
                opacity: 0.35, background: 'var(--amber-dim)', color: 'var(--cream)',
                borderRadius: '16px 16px 4px 16px',
              }}>
                haha yeah maybe
              </div>
            </div>
            <div style={{
              fontSize: '0.68rem', color: 'var(--amber)', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              textAlign: 'right', margin: '10px 0 3px',
            }}>
              RizzCraft suggests
            </div>
            <div style={{ display: 'flex', margin: '6px 0', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '78%', fontSize: '0.82rem', lineHeight: 1.45, padding: '0.55rem 0.85rem',
                background: 'var(--amber)', color: 'var(--bg)', fontWeight: 400,
                borderRadius: '16px 16px 4px 16px',
              }}>
                Bold claim. I&rsquo;m going to need evidence — Friday?
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="lp-stats" style={{
        borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)',
        padding: '2rem 2.5rem', display: 'flex', flexWrap: 'wrap',
      }}>
        {([
          { num: '3–5', desc: 'Reply options per generation — you choose what fits' },
          { num: '<10s', desc: 'From conversation to suggestions, every time' },
          { num: '6',   desc: 'Goals: reply, flirt, ask out, revive, recover, open' },
          { num: '5',   desc: 'Tones: casual, witty, charming, bold, romantic' },
        ] as const).map((s, i, arr) => (
          <div key={s.num} style={{
            flex: 1, minWidth: '140px', padding: '0.5rem 2rem 0.5rem 0',
            borderRight: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: '2.2rem', fontWeight: 500, color: 'var(--amber)',
              lineHeight: 1, marginBottom: '0.25rem',
            }}>
              {s.num}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', fontWeight: 300 }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section id="how" className="lp-section" style={{ padding: '6rem 2.5rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem' }}>
          How it works
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 500,
          lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '18ch',
        }}>
          From <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>blank screen</em> to confident reply in seconds.
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--cream-dim)', fontWeight: 300, maxWidth: '48ch', lineHeight: 1.7, marginBottom: '3rem' }}>
          No forms. No awkward questionnaires. Just paste the chat and tell us what you&rsquo;re going for.
        </p>
        <div className="lp-steps">
          {([
            { num: '01', title: 'Paste or upload the conversation', body: 'Drop in a screenshot or copy-paste the chat. RizzCraft reads the whole thread — not just the last message.' },
            { num: '02', title: 'Pick your goal and tone', body: 'A witty reply, asking them out, reviving a cold chat? Pick the energy. We’ll handle the words.' },
            { num: '03', title: 'Get replies that sound like you', body: 'Three to five options, each a different flavour. Refine any of them — shorter, bolder, funnier — until it feels right.' },
            { num: '04', title: 'Copy, send, done', body: 'One tap to copy. RizzCraft’s job is to hand you the words and get out of your way.' },
          ] as const).map(step => (
            <div key={step.num} className="lp-step">
              <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '3rem', fontWeight: 400, color: 'var(--amber-dim)', lineHeight: 1, marginBottom: '1rem' }}>{step.num}</div>
              <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--cream)', marginBottom: '0.5rem' }}>{step.title}</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.6 }}>{step.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="lp-section"
        style={{
          padding: '6rem 2.5rem',
          background: 'var(--bg2)',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem' }}>
          Features
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 500,
          lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '18ch',
        }}>
          Everything you need to <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>stop overthinking</em> and start texting.
        </h2>
        <div className="lp-features-grid">
          {([
            { icon: '◎', title: 'Screenshot reading', body: 'Upload from iMessage, WhatsApp, Hinge, Bumble. RizzCraft reads the thread and figures out who said what.' },
            { icon: '◈', title: 'Vibe check', body: 'Before you reply, RizzCraft reads the room. Engaged? Neutral? Going quiet? Replies are calibrated to the actual energy.' },
            { icon: '◐', title: 'Why it works', body: 'Tap any reply to see what’s behind it. Understanding the logic means next time, you’ll know what to say yourself.' },
            { icon: '◑', title: 'Refinement layer', body: 'One tap to make a reply shorter, smoother, bolder, or funnier. You’re always in control of how it lands.' },
            { icon: '◒', title: 'Ask them out flow', body: 'A dedicated mode for the highest-stakes moment — venue, timing, and a fallback if they say they’re busy.' },
            { icon: '◓', title: 'Reply history', body: 'Save what worked. Over time, RizzCraft learns your style and what actually gets responses.' },
          ] as const).map(f => (
            <div key={f.title} className="lp-feature-card">
              <div style={{
                width: '36px', height: '36px', background: 'var(--bg3)',
                border: '1px solid rgba(212,156,67,0.15)',
                borderRadius: '6px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '1rem', fontSize: '1rem',
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--cream)', marginBottom: '0.5rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.6 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Vibe check spotlight */}
      <section
        className="lp-section"
        style={{
          padding: '6rem 2.5rem',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div className="lp-vibe-grid">
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem' }}>
              The vibe check
            </p>
            <h2 style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 500,
              lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '18ch',
            }}>
              It reads the room <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>first.</em>
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--cream-dim)', fontWeight: 300, maxWidth: '48ch', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Before suggesting anything, RizzCraft analyses the tone of the whole conversation — not just the last message. Replies are matched to the actual situation.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.7 }}>
              This is the feature that makes RizzCraft feel human. No app should hand you bold flirty lines when the other person is barely responding. We don&rsquo;t do that.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              { dot: '#4caf79', cardBg: 'rgba(76,175,121,0.08)', cardBorder: 'rgba(76,175,121,0.2)', title: "She’s engaged", body: '"She’s matching your energy and asking follow-ups. Match it — don’t hold back."' },
              { dot: 'var(--amber)', cardBg: 'rgba(212,156,67,0.07)', cardBorder: 'rgba(212,156,67,0.15)', title: "She’s neutral", body: '"Replies are friendly but short. Keep it light — give her something easy to respond to."' },
              { dot: 'var(--cream-dim)', cardBg: 'rgba(240,234,216,0.04)', cardBorder: 'rgba(240,234,216,0.08)', title: "She’s gone quiet", body: '"She’s pulling back. No pressure moves. A low-key, genuine message works best here."' },
            ] as const).map(v => (
              <div key={v.title} style={{
                borderRadius: '8px', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: v.cardBg, border: `1px solid ${v.cardBorder}`,
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: v.dot, marginTop: '5px', flexShrink: 0, display: 'inline-block',
                }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--cream)', marginBottom: '3px' }}>{v.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontWeight: 300, lineHeight: 1.5 }}>{v.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section style={{ textAlign: 'center', padding: '6rem 2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', fontWeight: 400,
          fontStyle: 'italic', lineHeight: 1.3, color: 'var(--cream)',
          maxWidth: '24ch', margin: '0 auto 1.5rem',
        }}>
          &ldquo;Say what you actually mean — just better.&rdquo;
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          The RizzCraft promise
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lp-section" style={{ padding: '6rem 2.5rem', borderTop: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem' }}>
          Pricing
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 500,
          lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '18ch',
        }}>
          Start free. Upgrade when it&rsquo;s <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>working.</em>
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--cream-dim)', fontWeight: 300, maxWidth: '48ch', lineHeight: 1.7 }}>
          No pressure. The free tier is genuinely useful — upgrade when you want more.
        </p>
        <div className="lp-pricing-grid">
          {/* Free card */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border-light)',
            borderRadius: '8px', padding: '2rem', position: 'relative',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cream-dim)', marginBottom: '0.75rem' }}>Free</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '2.8rem', fontWeight: 500, color: 'var(--cream)', lineHeight: 1, marginBottom: '0.25rem' }}>$0</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginBottom: '1.5rem', fontWeight: 300 }}>3 reply sets per day. Always free.</div>
            <ul style={{ listStyle: 'none', marginBottom: '1.75rem' }}>
              {([
                { text: 'Paste conversation', included: true },
                { text: '3 reply suggestions', included: true },
                { text: 'Vibe check', included: true },
                { text: 'Screenshot upload', included: false },
                { text: 'All 5 tones', included: false },
                { text: 'Reply history', included: false },
                { text: 'Why it works', included: false },
              ] as const).map(item => (
                <li key={item.text} style={{
                  fontSize: '0.86rem', color: item.included ? 'var(--cream)' : 'var(--cream-dim)',
                  padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 300,
                }}>
                  <span style={{ color: 'var(--amber)', fontSize: '0.75rem' }}>—</span>
                  {item.text}
                </li>
              ))}
            </ul>
            <Link href="/sign-in" className="lp-pricing-card-ghost">Start free</Link>
          </div>

          {/* Pro card */}
          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--amber)',
            borderRadius: '8px', padding: '2rem', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-1px', right: '1.5rem',
              fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--bg)',
              background: 'var(--amber)', padding: '3px 12px',
              borderRadius: '0 0 6px 6px',
            }}>
              Most popular
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cream-dim)', marginBottom: '0.75rem' }}>Pro</div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '2.8rem', fontWeight: 500, color: 'var(--cream)', lineHeight: 1, marginBottom: '0.25rem' }}>
              $9<span style={{ fontSize: '1.1rem', fontWeight: 300, color: 'var(--cream-dim)' }}>/month</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginBottom: '1.5rem', fontWeight: 300 }}>Unlimited replies. Every feature.</div>
            <ul style={{ listStyle: 'none', marginBottom: '1.75rem' }}>
              {([
                'Paste conversation',
                'Unlimited reply sets',
                'Vibe check',
                'Screenshot upload',
                'All 5 tones',
                'Reply history + outcomes',
                'Why it works',
              ] as const).map(item => (
                <li key={item} style={{
                  fontSize: '0.86rem', color: 'var(--cream)',
                  padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 300,
                }}>
                  <span style={{ color: 'var(--amber)', fontSize: '0.75rem' }}>—</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/sign-in" className="lp-pricing-card-cta">Get Pro</Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-section" style={{ textAlign: 'center', padding: '6rem 2.5rem', borderTop: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem' }}>
          Ready?
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 500,
          lineHeight: 1.1, textAlign: 'center',
        }}>
          You already know what you <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>want</em> to say.<br />
          We just help you say it.
        </h2>
        <div style={{ height: '2rem' }} />
        <Link href="/sign-in" style={{
          display: 'inline-block', background: 'var(--amber)', color: 'var(--bg)',
          fontSize: '1rem', fontWeight: 500, padding: '1rem 2.5rem',
          borderRadius: '4px', textDecoration: 'none',
        }}>
          Try RizzCraft free
        </Link>
        <p style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', marginTop: '1rem', fontWeight: 300 }}>
          No sign-up needed. 3 free replies, right now.
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-light)', padding: '2rem 2.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '1.1rem', color: 'var(--cream-dim)' }}>
          Rizz<span style={{ color: 'var(--amber)' }}>Craft</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {(['Privacy', 'Terms', 'Contact'] as const).map(link => (
            <a key={link} href="#" style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--amber-dim)' }}>© 2025 RizzCraft</div>
      </footer>
    </>
  )
}
