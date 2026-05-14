@AGENTS.md

# RizzCraft — Claude Code guide

## What is RizzCraft

RizzCraft is an AI-powered texting copilot for dating and flirty conversations. Users paste or screenshot a conversation, choose a goal (reply, flirt, ask out, revive, recover, open) and a tone (casual, witty, charming, bold, romantic), and get 3–5 AI-generated reply suggestions with a "why it works" explanation. Each suggestion can be refined (shorter, bolder, funnier, etc.) with a single click. Free users get 3 reply generations per day; Pro is $9/month with a 7-day trial.

---

## Architecture

```
Next.js 16 App Router (Vercel Edge Functions)
        ↕
Supabase (Postgres + Auth)    Anthropic API (Claude Sonnet 4.6)
        ↕
    Stripe (payments)  ·  Resend (email)  ·  PostHog (analytics)  ·  Sentry (errors)
```

- All routes under `/app/api/` are Edge Functions deployed to Vercel.
- Auth is Supabase magic-link + Google OAuth. Never trust `user_id` from a request body — always derive from `auth.uid()`.
- Screenshots are processed in memory (base64 → Claude vision) and **never stored**. Only parsed text persists.
- Row Level Security is enabled on every table. Use the **service role key** server-side only; anon key + session cookie for client-side.

---

## Tech stack (as installed)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.6 | Framework — App Router |
| react / react-dom | 19.2.4 | UI |
| typescript | ^5 | Language |
| tailwindcss | ^4 | Styling |
| @supabase/supabase-js | ^2 | DB + auth client |
| @supabase/ssr | ^0.10.3 | Server-side Supabase helpers |
| @anthropic-ai/sdk | ^0.96.0 | Claude API |

Still to install: `stripe`, `@stripe/stripe-js`, `resend`, `posthog-js`, `posthog-node`, `@sentry/nextjs`, `zod`.

**IMPORTANT — Next.js 16:** This is **not** Next.js 13–15. Read `node_modules/next/dist/docs/` before writing routing, data-fetching, or middleware code. The docs index is at `node_modules/next/dist/docs/index.md`. Breaking changes are real.

---

## Recommended folder structure

```
/app
  /(auth)                magic link flow, callback page
  /(app)                 authenticated routes
    /home
    /history
    /settings
    /conversations/[id]
  /api
    /me                  GET + PATCH
    /conversations        parse-text, parse-screenshot, list, detail, delete
    /generate            POST (vibe check + reply gen) + /refine
    /replies             copied, save, outcome
    /stripe              checkout, portal, webhook
    /usage
/components
/lib
  /prompts               system + user prompt template functions
  /supabase              client helpers (server vs client)
  /anthropic             Claude API wrapper
  /stripe                Stripe client + webhook handlers
  /analytics             PostHog event helpers
/types                   shared TypeScript types
```

---

## Database tables (Supabase / Postgres)

| Table | Key columns |
|-------|-------------|
| `profiles` | extends `auth.users`; `subscription_status`, `daily_reply_count`, `texting_style` |
| `conversations` | `source` ('paste'/'screenshot'), `platform`, `person_name`, `context_notes` |
| `messages` | `sender` ('me'/'them'), `content`, `order_index` |
| `generations` | `goal`, `tone`, vibe check result, token counts, `model_used` |
| `replies` | `content`, `tone_tags`, `reasoning`, `rank`, `was_copied`, `was_saved`, `outcome` |
| `refinements` | `refinement_type`, `content`, `what_changed` |
| `usage_events` | lightweight analytics + rate limiting |

Schema SQL lives in `docs/rizzcraft-database-schema.sql`. Run it once in the Supabase SQL editor. Key stored procedures: `check_and_reset_daily_count(user_id)`, `increment_daily_count(user_id)`.

---

## AI pipeline (always follow this order)

1. **Vibe check** (`/lib/prompts/vibeCheck.ts`) — temperature 0.3, max 400 tokens. Classifies engagement as `engaged | neutral | cold` and sets `recommended_intensity`. **Always run before generation — never skip.**
2. **Reply generation** (`/lib/prompts/replyGeneration.ts`) — temperature 0.8, max 1500 tokens. Returns 3–5 replies with `tone_tags`, `reasoning`, and `rank`.
3. **Refinement** (`/lib/prompts/refinement.ts`) — temperature 0.8, max 400 tokens. Takes one reply + refinement type, returns one refined reply.
4. **Screenshot vision** (`/lib/prompts/screenshotParser.ts`) — temperature 0.2, max 1500 tokens. Vision call only; parse into `messages[]` array.

All prompts return **JSON only**. Wrap `JSON.parse` in try/catch with a re-prompt fallback. Full prompt text lives in `docs/rizzcraft-ai-prompts.md` — copy into `/lib/prompts/`. System prompt carries identity; user prompt carries runtime data (never swap — caching depends on it).

Model for all calls: **`claude-sonnet-4-6`** (switch vibe check + refinement to `claude-haiku-4-5` later for cost).

---

## API conventions

- All endpoints under `/api/` — Vercel Edge Functions.
- Auth: middleware extracts `user_id` from Supabase session cookie. Never trust body `user_id`.
- Rate limit: 30 req/min per user. Return `X-RateLimit-Remaining` + `X-RateLimit-Reset` headers on every response.
- Free tier: 3 generations/day → `402 daily_limit_reached`. Pro: unlimited.
- Error shape: `{ "error": { "code": "string", "message": "human-readable", "details": {} } }`.
- Safety blocks: `422 safety_redirect` with `{ reason, message, suggested_alternative_goal }`.
- Full endpoint specs in `docs/rizzcraft-api-spec.md`.

---

## `/api/generate` flow (the critical path)

1. `check_and_reset_daily_count(user_id)` → 402 if free user at limit.
2. Create `conversations` + `messages` rows in a transaction.
3. Run vibe check → fail fast with 500 if it errors.
4. Run reply generation with vibe result injected.
5. If response has `safety_redirect` → 422, do **not** save replies.
6. Insert `generations` + `replies` rows.
7. `increment_daily_count(user_id)` for free users.
8. Log `usage_events` row.
9. Return full response.

---

## Tiers and limits

| | Free | Pro |
|--|------|-----|
| Generations/day | 3 | Unlimited |
| Screenshot upload | No | Yes |
| Price | $0 | $9/month |
| Trial | — | 7-day free |

`subscription_status` values: `free | trial | pro | canceled`.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
RESEND_API_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_APP_URL
```

`.env.local` is git-ignored. Full setup walkthrough in `docs/rizzcraft-setup-guide.md`.

---

## Analytics events (PostHog)

Log these from API routes (never include message content — metadata only):
`signup_completed`, `conversation_started`, `generation_requested`, `generation_completed`, `reply_copied`, `reply_outcome_marked`, `paywall_shown`, `checkout_started`, `subscription_started`.

---

## Key conventions

- Screenshots: process in memory only, strip EXIF, never persist the image.
- Parsing: try heuristics (regex for `Me:` / `Her:` patterns) before calling Claude on text input.
- Prompt cache: system prompts are static; all dynamic data goes in the user prompt. Do not put runtime values in system prompts.
- Refinements: product decision — currently counted against free tier daily limit, but worth A/B testing as free.
- Conversation token cap: 4,000 input tokens (~3,000 words). Generation output cap: 1,500 tokens.

---

## Docs index

| File | Contents |
|------|----------|
| `docs/rizzcraft-phase-3-overview.md` | Product overview, build order, open questions |
| `docs/rizzcraft-database-schema.sql` | Full schema SQL, RLS policies, triggers |
| `docs/rizzcraft-ai-prompts.md` | All prompt templates + engineering principles |
| `docs/rizzcraft-api-spec.md` | Every endpoint, request/response shapes |
| `docs/rizzcraft-setup-guide.md` | Day-1 setup runbook (Supabase, Stripe, Vercel, etc.) |
