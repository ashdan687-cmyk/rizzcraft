-- ============================================================
-- RizzCraft database schema for Supabase (Postgres)
-- Run this in the Supabase SQL editor in order, top to bottom.
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- PROFILES
-- Extends Supabase's built-in auth.users with app-specific data.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  texting_style text,                                    -- free-text personalization
  subscription_status text not null default 'free',      -- 'free' | 'trial' | 'pro' | 'canceled'
  subscription_id text,                                  -- Stripe subscription id
  trial_ends_at timestamptz,
  pro_ends_at timestamptz,
  daily_reply_count int not null default 0,
  daily_reply_reset_at timestamptz not null default (now() at time zone 'utc'),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_subscription_status_idx on public.profiles(subscription_status);


-- ============================================================
-- CONVERSATIONS
-- One row per chat the user is working on.
-- ============================================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('paste', 'screenshot')),
  platform text,                                         -- 'imessage' | 'whatsapp' | 'hinge' | 'bumble' | 'instagram' | null
  person_name text,                                      -- optional: who they're texting
  context_notes text,                                    -- user's free-text context
  parsing_confidence text,                               -- 'high' | 'medium' | 'low' (from screenshot parse)
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations(user_id, created_at desc);
create index conversations_user_active_idx on public.conversations(user_id) where archived = false;


-- ============================================================
-- MESSAGES
-- The parsed messages of a conversation, in order.
-- ============================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('me', 'them')),
  content text not null,
  order_index int not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages(conversation_id, order_index);


-- ============================================================
-- GENERATIONS
-- Each time the user asks RizzCraft to suggest replies.
-- Stores the input parameters and the vibe check result.
-- ============================================================
create table public.generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  goal text not null check (goal in ('reply', 'flirt', 'ask_out', 'revive', 'recover', 'open')),
  tone text not null check (tone in ('casual', 'witty', 'charming', 'bold', 'romantic')),
  vibe_engagement text check (vibe_engagement in ('engaged', 'neutral', 'cold')),
  vibe_reasoning text,
  vibe_user_note text,
  vibe_intensity text check (vibe_intensity in ('low', 'medium', 'high')),
  model_used text,                                       -- 'claude-sonnet-4-6' etc.
  input_token_count int,
  output_token_count int,
  latency_ms int,
  error text,                                            -- non-null if generation failed
  created_at timestamptz not null default now()
);

create index generations_user_idx on public.generations(user_id, created_at desc);
create index generations_conversation_idx on public.generations(conversation_id, created_at desc);


-- ============================================================
-- REPLIES
-- The 3-5 reply suggestions generated for a single generation.
-- ============================================================
create table public.replies (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  tone_tags jsonb not null default '[]'::jsonb,          -- e.g. ['witty', 'asks out']
  reasoning text,                                        -- the "why it works" explanation
  rank int not null,                                     -- 1 = top pick
  was_copied boolean not null default false,
  was_saved boolean not null default false,
  outcome text check (outcome in ('got_reply', 'no_reply', 'sent_no_response_yet')),
  outcome_recorded_at timestamptz,
  created_at timestamptz not null default now()
);

create index replies_generation_idx on public.replies(generation_id, rank);
create index replies_user_saved_idx on public.replies(user_id) where was_saved = true;
create index replies_user_outcome_idx on public.replies(user_id, outcome) where outcome is not null;


-- ============================================================
-- REFINEMENTS
-- When the user clicks "shorter / bolder / funnier" on a reply.
-- ============================================================
create table public.refinements (
  id uuid primary key default uuid_generate_v4(),
  parent_reply_id uuid not null references public.replies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  refinement_type text not null check (refinement_type in ('shorter', 'bolder', 'funnier', 'smoother', 'less_intense', 'more_seductive')),
  content text not null,
  what_changed text,
  created_at timestamptz not null default now()
);

create index refinements_parent_idx on public.refinements(parent_reply_id, created_at);


-- ============================================================
-- USAGE EVENTS (lightweight analytics + rate limiting)
-- ============================================================
create table public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,                              -- 'vibe_check' | 'generation' | 'refinement' | 'screenshot_parse'
  cost_tokens int,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index usage_events_user_idx on public.usage_events(user_id, created_at desc);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at columns
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();


-- Create a profile row automatically on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Daily reply counter reset (called by the generate endpoint, not a cron)
create or replace function public.check_and_reset_daily_count(p_user_id uuid)
returns int language plpgsql as $$
declare
  v_count int;
  v_reset_at timestamptz;
begin
  select daily_reply_count, daily_reply_reset_at
    into v_count, v_reset_at
    from public.profiles where id = p_user_id;

  -- if reset time is older than 24h, zero the counter
  if v_reset_at < (now() - interval '24 hours') then
    update public.profiles
      set daily_reply_count = 0,
          daily_reply_reset_at = (date_trunc('day', now() at time zone 'utc') + interval '1 day')
      where id = p_user_id;
    return 0;
  end if;

  return v_count;
end;
$$;


-- Increment daily count (call after successful generation for free users)
create or replace function public.increment_daily_count(p_user_id uuid)
returns int language plpgsql as $$
declare
  v_count int;
begin
  update public.profiles
    set daily_reply_count = daily_reply_count + 1
    where id = p_user_id
    returning daily_reply_count into v_count;
  return v_count;
end;
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- Every table must have RLS. Users only see their own data.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.generations enable row level security;
alter table public.replies enable row level security;
alter table public.refinements enable row level security;
alter table public.usage_events enable row level security;


-- PROFILES policies
create policy "users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);


-- CONVERSATIONS policies
create policy "users read own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "users insert own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);
create policy "users update own conversations"
  on public.conversations for update using (auth.uid() = user_id);
create policy "users delete own conversations"
  on public.conversations for delete using (auth.uid() = user_id);


-- MESSAGES policies (joined through conversations)
create policy "users read own messages"
  on public.messages for select using (
    exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid())
  );
create policy "users insert own messages"
  on public.messages for insert with check (
    exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid())
  );


-- GENERATIONS policies
create policy "users read own generations"
  on public.generations for select using (auth.uid() = user_id);
create policy "users insert own generations"
  on public.generations for insert with check (auth.uid() = user_id);


-- REPLIES policies
create policy "users read own replies"
  on public.replies for select using (auth.uid() = user_id);
create policy "users insert own replies"
  on public.replies for insert with check (auth.uid() = user_id);
create policy "users update own replies"
  on public.replies for update using (auth.uid() = user_id);


-- REFINEMENTS policies
create policy "users read own refinements"
  on public.refinements for select using (auth.uid() = user_id);
create policy "users insert own refinements"
  on public.refinements for insert with check (auth.uid() = user_id);


-- USAGE_EVENTS policies
create policy "users read own usage"
  on public.usage_events for select using (auth.uid() = user_id);
create policy "service inserts usage"                    -- inserted by edge functions using service role
  on public.usage_events for insert with check (true);


-- ============================================================
-- DONE
-- After running this:
-- 1. Enable email + Google in Supabase Auth dashboard
-- 2. Set up Resend SMTP for magic links (see setup-guide.md)
-- 3. Generate service role key and add to Vercel env vars
-- ============================================================
