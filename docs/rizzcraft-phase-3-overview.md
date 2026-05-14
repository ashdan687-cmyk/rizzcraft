# RizzCraft — Phase 3 technical plan

This is the complete technical specification for building RizzCraft. Hand it to a developer (or use it yourself with Claude Code) and they can ship the app from this.

## What's inside

| File | Purpose | Where it goes |
|------|---------|--------------|
| `rizzcraft-database-schema.sql` | Database tables, indexes, RLS policies, triggers | Paste into Supabase SQL editor and run |
| `rizzcraft-ai-prompts.md` | All AI prompts (vibe check, reply gen, refinement, vision, safety) | Copy into `/lib/prompts/` in the codebase |
| `rizzcraft-api-spec.md` | REST API contract — every endpoint, request/response shapes | Reference for both frontend and backend dev |
| `rizzcraft-setup-guide.md` | Step-by-step: env vars, Supabase config, deployment | Day-1 setup runbook |

## Default decisions made for you

These are reasonable defaults that match the product. Override if you have a strong reason.

- **AI model**: Claude Sonnet 4.6 for everything in v1. Quality matters more than cost while validating the product. Switch vibe check + refinement to Haiku 4.5 later if costs become a problem.
- **Auth methods**: Magic link (email) and Google Sign-In. Apple Sign-In added when mobile app ships.
- **Privacy**: Screenshots are processed in memory and never stored. Only the parsed text persists.
- **Free tier**: 3 reply generations per day, resets at midnight UTC.
- **Pro tier**: $9/month with 7-day free trial.
- **Rate limits**: 30 requests/minute per authenticated user (generous; protects against runaway clients).
- **Token limits**: Conversations capped at 4,000 input tokens (~3,000 words). Generation responses capped at 1,500 output tokens.

## Recommended build order

The fastest path from zero to working app:

1. Run the schema SQL in Supabase — gives you the database in 5 minutes.
2. Set up Supabase auth following the setup guide — gets sign-in working.
3. Build the `/api/generate` endpoint first using the prompt spec — this is your core value. Test it standalone with hardcoded conversations before wiring up the UI.
4. Build the paste-text input flow end-to-end (no screenshot yet) — fastest way to get a working demo.
5. Add screenshot vision flow once the text flow works.
6. Add Stripe paywall last — you can ship to beta without payments.

You can be at "working demo with real AI replies" in 3–5 focused days following this order.

## Open questions to confirm before building

These don't block starting, but worth deciding early:

- **Domain**: rizzcraft.com? rizzcraft.app? getrizzcraft.com? Lock this down before Phase 4.
- **Email sender**: hello@rizzcraft.com? noreply@? Affects Resend setup.
- **Stripe product ID strategy**: One product with monthly + yearly prices? Or separate products? The API spec assumes one product.
- **Logo and favicon**: Need before launch but not before building. Keep using the wordmark for now.
