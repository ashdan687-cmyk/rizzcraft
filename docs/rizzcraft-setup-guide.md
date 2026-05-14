# RizzCraft setup guide

Step-by-step runbook to get from zero to a running development environment. Follow in order. Should take 1–2 hours the first time.

## Prerequisites

- Node.js 20+ installed
- A GitHub account
- A credit card on file (you won't be charged at MVP usage levels — all free tiers — but services require it)
- About $20 in your Anthropic account for initial development

---

## Step 1 — Create the GitHub repository

1. Create a new private repo named `rizzcraft` on GitHub.
2. Clone it locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/rizzcraft.git
   cd rizzcraft
   ```

---

## Step 2 — Initialize the Next.js project

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

When prompted:
- Use TypeScript: **yes**
- Use ESLint: **yes**
- Use Tailwind CSS: **yes**
- Use App Router: **yes**
- Customize default import alias: **`@/*`**

Install the dependencies we'll use:

```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk stripe @stripe/stripe-js resend posthog-js posthog-node @sentry/nextjs zod
npm install -D @types/node
```

---

## Step 3 — Set up Supabase

1. Create an account at [supabase.com](https://supabase.com) if you don't have one.
2. Create a new project. Pick the region nearest your target audience (for Nairobi, choose `eu-west-2` or `eu-central-1`).
3. Wait 2 minutes for the project to provision.
4. In the project dashboard, go to **SQL Editor** → **New query**.
5. Paste the contents of `rizzcraft-database-schema.sql` and run it. You should see "Success. No rows returned."
6. Go to **Settings** → **API** and copy three values:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → this is your `SUPABASE_SERVICE_ROLE_KEY`

### Enable auth providers

1. Go to **Authentication** → **Providers**.
2. **Email** is enabled by default. Under it, enable **Confirm email** = off (for magic links) or on (for traditional flow). For RizzCraft, magic links are the recommended flow.
3. **Google** — toggle on. You'll need to set up an OAuth app in Google Cloud Console:
   - Go to console.cloud.google.com → APIs & Services → Credentials → Create OAuth client ID
   - App type: **Web application**
   - Authorized redirect URIs: paste the redirect URL Supabase shows you (looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
   - Copy the client ID and secret back into Supabase.
4. Add `https://rizzcraft.app` (or whatever your domain is) to **Authentication** → **URL Configuration** → **Site URL**.

### Configure magic link emails via Resend (Step 6)

We'll wire this up after creating the Resend account.

---

## Step 4 — Set up Anthropic API

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Add a payment method and a $20 starting credit.
3. Go to **Settings** → **API Keys** → **Create Key**.
4. Name it `rizzcraft-dev`. Copy the key — you won't see it again.
5. This is your `ANTHROPIC_API_KEY`.

---

## Step 5 — Set up Stripe

1. Create an account at [stripe.com](https://stripe.com).
2. Stay in **Test mode** for development (toggle at top right of dashboard).
3. Go to **Products** → **Add product**:
   - Name: `RizzCraft Pro`
   - Description: `Unlimited replies, screenshot upload, every feature unlocked`
   - Pricing model: **Recurring** → **$9.00 USD / month**
   - Free trial period: **7 days**
4. Copy the **Price ID** (starts with `price_`) — this is your `STRIPE_PRO_PRICE_ID`.
5. Go to **Developers** → **API keys** and copy the **Secret key** — this is your `STRIPE_SECRET_KEY`.
6. Webhook setup comes later (Step 9, after deploying).

---

## Step 6 — Set up Resend

1. Create an account at [resend.com](https://resend.com).
2. Add your domain (or use the test domain initially).
3. Get the API key from the dashboard → this is your `RESEND_API_KEY`.
4. Back in Supabase, go to **Authentication** → **Email Templates** → **SMTP Settings** and configure:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `<your RESEND_API_KEY>`
   - Sender email: `hello@yourdomain.com`
5. Customize the magic link email template to match RizzCraft's voice (see template below).

### Magic link email template

Replace the default Supabase template with this:

```html
<h2>Your link to RizzCraft</h2>
<p>Tap the link below to sign in. It's only good for one use.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to RizzCraft →</a></p>
<p style="color: #888; font-size: 14px;">If you didn't ask for this, you can ignore it.</p>
```

---

## Step 7 — Set up PostHog (analytics)

1. Create an account at [posthog.com](https://posthog.com).
2. Create a project named `rizzcraft`.
3. Copy the **Project API key** — this is your `NEXT_PUBLIC_POSTHOG_KEY`.
4. The `NEXT_PUBLIC_POSTHOG_HOST` is `https://us.posthog.com` (or eu if you chose that region).

---

## Step 8 — Set up Sentry (error tracking)

1. Create an account at [sentry.io](https://sentry.io).
2. Create a new project: platform = **Next.js**.
3. Follow Sentry's wizard — it'll add config files to your repo.
4. The DSN it gives you is `SENTRY_DSN` — added to `.env.local` automatically by the wizard.

---

## Step 9 — Local environment file

Create `.env.local` at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=     # populated after step 11
STRIPE_PRO_PRICE_ID=price_...

# Resend
RESEND_API_KEY=re_...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` (Next.js does this by default — verify it's there).

---

## Step 10 — Deploy to Vercel

1. Create an account at [vercel.com](https://vercel.com) and connect your GitHub.
2. Import the `rizzcraft` repo.
3. Vercel will detect Next.js automatically.
4. Add all the environment variables from `.env.local` into **Project Settings** → **Environment Variables**. Update `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://rizzcraft.vercel.app`).
5. Deploy.

You should now have a live URL — though the app won't do much yet until Phase 4 starts.

---

## Step 11 — Wire up the Stripe webhook

This needs the live URL from step 10.

1. In the Stripe dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://rizzcraft.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`) — this is your `STRIPE_WEBHOOK_SECRET`. Add it to Vercel env vars and redeploy.

---

## Step 12 — Custom domain (optional but recommended)

1. Buy `rizzcraft.app` or `getrizzcraft.com` from Namecheap or Cloudflare.
2. In Vercel → **Project Settings** → **Domains** → add the domain.
3. Update DNS records as Vercel instructs (CNAME or A record).
4. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to the new domain.
5. Update Supabase **Site URL** to the new domain.
6. Update Stripe webhook endpoint to the new domain.
7. Update Google OAuth redirect URIs to include the new domain.

---

## Step 13 — Repo structure (recommended)

Set up these folders so the codebase stays clean from day 1:

```
/app
  /(auth)            magic link flow, callback page
  /(app)             authenticated app routes
    /home
    /history
    /settings
    /conversations/[id]
  /api
    /me
    /conversations
    /generate
    /replies
    /stripe
    /usage
/components          React components
/lib
  /prompts           system + user prompt templates
  /supabase          client helpers (server vs client)
  /anthropic         Claude API client wrapper
  /stripe            Stripe client + webhook handlers
  /analytics         PostHog event helpers
/types               shared TypeScript types
```

---

## Step 14 — Verify everything works

After completing all steps:

1. Visit your deployed URL.
2. Sign up with magic link — should arrive in your inbox within a minute.
3. After signing in, check the Supabase dashboard → **Authentication** → **Users**. You should see your user. Check **Table editor** → **profiles**. You should see a profile row was auto-created.
4. Make a test Stripe checkout (use card `4242 4242 4242 4242`, any future expiry, any CVC). Confirm the webhook fires in Stripe → **Webhooks** → click your endpoint → **Events**.

If all four work, you're ready to start Phase 4.

---

## Step 15 — Cost monitoring

Set spending alerts now so you don't get surprised:

- **Anthropic**: console.anthropic.com → Usage → Set monthly budget alert at $50
- **Vercel**: dashboard → Settings → Billing → Spending caps (free tier should never overflow for MVP)
- **Stripe**: no cost concern, takes percentage only
- **Supabase**: dashboard → Reports → set usage alerts at 80% of free tier limits

---

## Troubleshooting common issues

**Magic link emails not arriving**: Check Resend dashboard → Emails. If they're sending but landing in spam, set up SPF and DKIM records for your domain.

**Supabase RLS blocking inserts**: You probably forgot to authenticate the request. The service role key bypasses RLS — use it on the server (Edge Functions) but never expose it to the client. For client-side calls, the anon key + valid session cookie is what makes RLS allow access.

**Anthropic API returning 401**: Key is wrong or your account is out of credits. Check the dashboard.

**Stripe webhook returning 400**: Signature verification failed. The `STRIPE_WEBHOOK_SECRET` in Vercel doesn't match what Stripe is sending. Re-copy from the webhook detail page.

**Next.js build failing on Vercel**: Almost always missing env vars. Vercel shows clear errors — read them.

---

## What you have after this guide

A fully wired backend with:
- Database schema deployed
- Auth ready (magic link + Google)
- Stripe ready (test mode)
- Claude API key live
- Analytics + error tracking running
- Deployed to a real URL

Zero of the actual product features built yet. That's Phase 4.
