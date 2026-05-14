---
name: project-rizzcraft
description: RizzCraft product overview — what it is, tech stack, current build state, and recommended next steps
metadata:
  type: project
---

RizzCraft is an AI-powered texting copilot for dating conversations. Users paste or screenshot a chat, pick a goal + tone, and get 3–5 Claude-generated reply suggestions with "why it works" explanations. Replies can be refined (shorter, bolder, funnier, etc.).

**Why:** Founder is building from a complete spec (5 docs in `/docs/`). Phase 3 spec is complete; Phase 4 is feature build.

**Stack:** Next.js 16.2.6 (App Router) + React 19 + Tailwind v4, Supabase (auth + Postgres), Anthropic SDK ^0.96.0, Stripe, Resend, PostHog, Sentry. Deployed on Vercel.

**Current state (as of 2026-05-14):** Phase 4 in progress. Built: `/api/generate` (full pipeline — auth, daily limit check, vibe check, reply gen, DB persistence into conversations/messages/generations/replies/usage_events, daily counter increment), Supabase auth magic-link flow, middleware, `/sign-in`, `/home` placeholder. Brand fonts + CSS vars in globals. NOT yet built: conversation input UI, screenshot vision, Stripe paywall. Dependencies still to install: Stripe, Resend, PostHog, Sentry, Zod.

**How to apply:** Next build order: (1) paste-text conversation input UI on /home, (2) conversation history page, (3) screenshot vision, (4) Stripe paywall.

**Tone mismatch fixed:** Schema check constraint for `tone` is `('casual', 'witty', 'charming', 'bold', 'romantic')` — NOT warm/direct. route.ts and test page now use the correct values.

**Key constraints:**
- Screenshots never stored — in-memory only
- Free tier: 3 generations/day; Pro: $9/month with 7-day trial
- Always run vibe check before generation — never skip
- All prompts return JSON only; system prompt = identity, user prompt = data
- Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` before writing routing code
