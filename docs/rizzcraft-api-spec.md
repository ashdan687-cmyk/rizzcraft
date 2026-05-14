# RizzCraft API specification

REST endpoints the frontend will call. All routes live under `/api/` in the Next.js project (Vercel Edge Functions).

## Conventions

- All requests and responses are JSON unless noted.
- All non-public endpoints require a valid Supabase session cookie. The middleware extracts `user_id` from `auth.uid()` — never trust a `user_id` sent in the request body.
- Error responses always follow this shape:
  ```json
  { "error": { "code": "string", "message": "human-readable", "details": {} } }
  ```
- All timestamps are ISO 8601 UTC.
- Rate limit: 30 requests/minute per user. Limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) are returned on every response.

## Status code conventions

| Code | When |
|------|------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (validation failed) |
| 401 | Not authenticated |
| 402 | Free tier limit hit — payment required to continue |
| 403 | Authenticated but not allowed (RLS would have blocked anyway) |
| 404 | Resource doesn't exist or user can't see it |
| 422 | Request was valid but business rule blocked it (e.g. content violates safety) |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Authentication endpoints

Mostly handled by Supabase's client SDK directly from the frontend — we don't reimplement them. Two helpers we do expose:

### `GET /api/me`

Returns the current user's profile.

Response 200:
```json
{
  "id": "uuid",
  "email": "jake@example.com",
  "display_name": "Jake",
  "texting_style": "I'm casual and a bit sarcastic",
  "subscription_status": "free",
  "trial_ends_at": null,
  "pro_ends_at": null,
  "daily_replies_remaining": 2,
  "daily_replies_total": 3,
  "onboarding_completed": true
}
```

### `PATCH /api/me`

Update the current user's profile.

Request:
```json
{
  "display_name": "Jake",
  "texting_style": "Casual and sarcastic"
}
```

Response 200: same shape as `GET /api/me`.

---

## Conversation parsing

### `POST /api/conversations/parse-text`

Takes a pasted conversation string and returns parsed messages. Does NOT save anything yet — that happens at generation time.

Request:
```json
{
  "raw_text": "Her: haha ok you clearly haven't tried...\nMe: haha yeah maybe\n...",
  "context_notes": "Met at a party last weekend"
}
```

Response 200:
```json
{
  "platform": "unknown",
  "messages": [
    { "sender": "them", "content": "haha ok you clearly haven't tried the jollof at that place on Kimathi", "order_index": 1 },
    { "sender": "me", "content": "haha yeah maybe", "order_index": 2 }
  ],
  "confidence": "high",
  "needs_confirmation": false,
  "notes": ""
}
```

Errors:
- 400 `empty_text` if `raw_text` is empty or whitespace
- 400 `text_too_long` if over 4,000 input tokens (~3,000 words)
- 400 `could_not_parse` if no recognizable conversation structure

Implementation notes:
- Parse heuristics first (looks for "Her:", "Me:", "Them:", etc., or alternating quoted blocks)
- If heuristics fail, call Claude with the text parsing prompt
- Never persist anything from this endpoint — return parsed data only


### `POST /api/conversations/parse-screenshot`

Takes an uploaded image and returns parsed conversation. Image is processed in memory and discarded.

Request (multipart form data):
- `image`: PNG or JPEG, max 10MB
- `context_notes`: string (optional)

Response 200: same shape as `parse-text` response, with `platform` likely identified.

Errors:
- 400 `image_too_large`
- 400 `unsupported_format`
- 400 `not_a_conversation` if Claude vision couldn't identify a conversation
- 422 `confidence_too_low` if confidence comes back "low" — frontend should show paste fallback

Implementation notes:
- Upload to Vercel as base64 in memory only
- Call Claude vision API with the screenshot parsing prompt
- Do NOT save the image anywhere — log only the parse result
- Strip EXIF data before processing for privacy

---

## Reply generation (the core endpoint)

### `POST /api/generate`

The big one. Takes a parsed conversation + goal + tone, runs the vibe check, then runs reply generation, then returns the full result.

Request:
```json
{
  "messages": [
    { "sender": "them", "content": "haha ok you clearly haven't tried the jollof at that place on Kimathi", "order_index": 1 },
    { "sender": "me", "content": "haha yeah maybe", "order_index": 2 },
    { "sender": "them", "content": "no seriously, you're missing out. it's a vibe", "order_index": 3 }
  ],
  "context_notes": "Met at a house party last weekend",
  "platform": "whatsapp",
  "person_name": "Amara",
  "goal": "ask_out",
  "tone": "witty",
  "source": "paste"
}
```

Response 201:
```json
{
  "generation_id": "uuid",
  "conversation_id": "uuid",
  "vibe": {
    "engagement": "engaged",
    "reasoning": "Asking follow-up questions, matching playful energy, multi-message bursts.",
    "user_facing_note": "They're matching your energy and asking follow-ups. Match it — don't hold back.",
    "recommended_intensity": "high"
  },
  "replies": [
    {
      "id": "uuid",
      "content": "Bold claim. I'm going to need evidence — Friday?",
      "tone_tags": ["witty", "asks out"],
      "reasoning": "Calls back her exact claim ('evidence'), uses humor to soften the ask, and the time suggestion is low-pressure — easy to deflect if she's not into it.",
      "rank": 1
    },
    {
      "id": "uuid",
      "content": "Jollof challenge accepted. Where and when?",
      "tone_tags": ["casual", "playful"],
      "reasoning": "Direct and confident, treats the ask as already settled. Works because she escalated the claim — meeting that energy reads as comfortable, not pushy.",
      "rank": 2
    }
  ],
  "usage": {
    "daily_replies_remaining": 1,
    "daily_replies_total": 3,
    "is_pro": false
  }
}
```

Errors:
- 400 `invalid_goal` if goal isn't in the allowed enum
- 400 `invalid_tone` if tone isn't in the allowed enum
- 400 `messages_too_short` if fewer than 1 message
- 402 `daily_limit_reached` if free user hit the 3/day cap — body includes `upgrade_url`
- 422 `safety_redirect` if the model returned a safety block — body includes the redirect message
- 500 `ai_call_failed` for unexpected Claude API errors

Special 402 response:
```json
{
  "error": {
    "code": "daily_limit_reached",
    "message": "You've used all 3 free replies today. Upgrade to keep going or come back tomorrow.",
    "details": {
      "resets_at": "2025-01-16T00:00:00Z",
      "upgrade_url": "/api/stripe/checkout"
    }
  }
}
```

Special 422 response:
```json
{
  "error": {
    "code": "safety_redirect",
    "message": "They seem a bit quiet right now — pushing for a date here would probably backfire. Want me to suggest something low-key instead?",
    "details": {
      "reason": "intensity_mismatch",
      "suggested_alternative_goal": "reply"
    }
  }
}
```

Implementation flow:
1. Check daily usage via `check_and_reset_daily_count(user_id)` — return 402 if at limit and user is `free`
2. Create the `conversations` row + `messages` rows in a transaction
3. Build vibe check prompt and call Claude
4. If vibe check fails, return 500 — don't proceed without it
5. Build reply generation prompt with vibe result, call Claude
6. If response includes `safety_redirect`, return 422 with the redirect message (do NOT save replies)
7. Create the `generations` row with all the metadata
8. Insert the replies into the `replies` table
9. Call `increment_daily_count(user_id)` for free users
10. Log a `usage_events` row
11. Return the full response


### `POST /api/generate/refine`

Refine a single existing reply.

Request:
```json
{
  "reply_id": "uuid",
  "refinement_type": "shorter"
}
```

`refinement_type` is one of: `shorter` | `bolder` | `funnier` | `smoother` | `less_intense` | `more_seductive`.

Response 201:
```json
{
  "refinement_id": "uuid",
  "parent_reply_id": "uuid",
  "content": "Bold claim. Friday?",
  "what_changed": "Cut the middle clause — the callback to 'evidence' was carrying enough weight on its own."
}
```

Errors:
- 400 `invalid_refinement_type`
- 402 `daily_limit_reached` — refinements count against the daily limit for free users (or could be unlimited as a product call — see notes)
- 404 `reply_not_found`

Implementation notes:
- Refinements are cheap and feel like part of the same "generation" — consider making them free for free users (just throttle by rate limit). This is a product decision worth A/B testing.

---

## Reply outcome tracking

### `POST /api/replies/:id/copied`

Mark a reply as copied (user tapped the copy button). Used for analytics.

Request: empty body.

Response 200:
```json
{ "id": "uuid", "was_copied": true }
```


### `POST /api/replies/:id/save`

Save a reply to the user's saved list.

Request:
```json
{ "saved": true }
```

Response 200:
```json
{ "id": "uuid", "was_saved": true }
```


### `POST /api/replies/:id/outcome`

Mark whether the recipient replied to a sent reply. Powers the "did this work?" feature.

Request:
```json
{ "outcome": "got_reply" }
```

`outcome` is one of: `got_reply` | `no_reply` | `sent_no_response_yet`.

Response 200:
```json
{ "id": "uuid", "outcome": "got_reply", "outcome_recorded_at": "2025-01-15T19:14:00Z" }
```

---

## History endpoints

### `GET /api/conversations`

List user's conversations, paginated, most recent first.

Query params:
- `limit` (default 20, max 50)
- `cursor` (opaque pagination token from previous response)
- `filter` — one of `all` | `got_reply` | `awaiting` | `saved` (default `all`)

Response 200:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "person_name": "Amara",
      "platform": "hinge",
      "last_message_preview": "no seriously, you're missing out...",
      "last_reply_preview": "Bold claim. I'm going to need evidence — Friday?",
      "last_reply_outcome": "got_reply",
      "created_at": "2025-01-15T17:14:00Z",
      "updated_at": "2025-01-15T17:14:00Z"
    }
  ],
  "next_cursor": "opaque_string_or_null"
}
```


### `GET /api/conversations/:id`

Full conversation detail including all messages and generations.

Response 200:
```json
{
  "id": "uuid",
  "person_name": "Amara",
  "platform": "hinge",
  "context_notes": "Met at a party last weekend",
  "messages": [
    { "id": "uuid", "sender": "them", "content": "...", "order_index": 1 }
  ],
  "generations": [
    {
      "id": "uuid",
      "goal": "ask_out",
      "tone": "witty",
      "vibe": { "engagement": "engaged", "user_facing_note": "..." },
      "created_at": "...",
      "replies": [
        {
          "id": "uuid",
          "content": "...",
          "tone_tags": ["witty", "asks out"],
          "reasoning": "...",
          "rank": 1,
          "was_copied": true,
          "was_saved": false,
          "outcome": "got_reply"
        }
      ]
    }
  ]
}
```


### `DELETE /api/conversations/:id`

Archive (soft delete) a conversation. Sets `archived = true`. Doesn't actually delete data, so it's recoverable. A hard delete endpoint can come later if needed for GDPR compliance.

Response 200:
```json
{ "id": "uuid", "archived": true }
```

---

## Subscription endpoints

### `POST /api/stripe/checkout`

Create a Stripe Checkout session for the Pro subscription.

Request:
```json
{ "return_url": "https://app.rizzcraft.com/settings" }
```

Response 200:
```json
{ "checkout_url": "https://checkout.stripe.com/c/pay/cs_...", "session_id": "cs_..." }
```


### `POST /api/stripe/portal`

Open the Stripe customer portal (manage / cancel subscription).

Request:
```json
{ "return_url": "https://app.rizzcraft.com/settings" }
```

Response 200:
```json
{ "portal_url": "https://billing.stripe.com/..." }
```


### `POST /api/stripe/webhook`

Stripe webhook endpoint. Verifies signature, updates `profiles.subscription_status`.

Events to handle:
- `checkout.session.completed` → set status to `trial` or `pro`
- `customer.subscription.updated` → update status, `pro_ends_at`
- `customer.subscription.deleted` → set status to `canceled`
- `invoice.payment_failed` → no status change yet; alert user via email after 3 failures

Response 200: empty body.

---

## Usage / metering

### `GET /api/usage`

Quick usage check, used by the home screen widget.

Response 200:
```json
{
  "daily_replies_remaining": 1,
  "daily_replies_total": 3,
  "resets_at": "2025-01-16T00:00:00Z",
  "is_pro": false,
  "is_trialing": false,
  "trial_ends_at": null
}
```

---

## Environment variables this API needs

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# Resend (for magic link emails)
RESEND_API_KEY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# App
NEXT_PUBLIC_APP_URL=https://rizzcraft.app
```

See `rizzcraft-setup-guide.md` for how to obtain each of these.

---

## Webhooks and observability

Every endpoint should:
- Log to PostHog with `event_type` and relevant properties (anonymized — no message content, just metadata)
- Catch errors and report to Sentry with the user ID and request context
- Return clear error codes that the frontend can map to user-facing messages

Specifically log these events for product analytics:

| Event name | When | Properties |
|------------|------|------------|
| `signup_completed` | New profile row created | `signup_method` |
| `conversation_started` | First parse-text or parse-screenshot call of a session | `source`, `platform` |
| `generation_requested` | `/api/generate` called | `goal`, `tone`, `vibe`, `is_pro` |
| `generation_completed` | Replies returned to user | `goal`, `tone`, `vibe`, `latency_ms`, `reply_count` |
| `reply_copied` | User tapped copy | `goal`, `tone`, `rank` |
| `reply_outcome_marked` | User marked outcome | `outcome`, `goal`, `tone` |
| `paywall_shown` | User hit free limit | `daily_count` |
| `checkout_started` | User clicked upgrade | `source` |
| `subscription_started` | Webhook fired | `plan`, `trial` |
