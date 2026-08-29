-- Run this once in your Supabase project's SQL Editor
-- (Project dashboard -> SQL Editor -> New query -> paste -> Run)

create table if not exists public.leaderboard (
  player_id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 24),
  lifetime_focus_minutes integer not null default 0,
  lifetime_sessions_completed integer not null default 0,
  lifetime_sessions_failed integer not null default 0,
  lives_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

-- Public leaderboard: anyone can read all rows.
create policy "Public read access"
  on public.leaderboard for select
  using (true);

-- Nickname-only identity (no auth): anyone holding a player_id can write
-- their own row. This is a casual, trust-based leaderboard -- since there
-- is no login, scores are not cryptographically tamper-proof (a
-- determined user could call the API directly and post fake stats). That
-- trade-off is inherent to a no-login design; revisit if you later add
-- real accounts and want moderation.
create policy "Anyone can insert a row"
  on public.leaderboard for insert
  with check (true);

create policy "Anyone can update rows"
  on public.leaderboard for update
  using (true)
  with check (true);

create index if not exists leaderboard_focus_minutes_idx
  on public.leaderboard (lifetime_focus_minutes desc);

create index if not exists leaderboard_sessions_idx
  on public.leaderboard (lifetime_sessions_completed desc);

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Suggestion box, not a public wall: anyone can submit feedback, but there is
-- no select policy, so the anon key can never read it back. Review it in the
-- Supabase dashboard's Table Editor (which uses your service role, bypassing RLS).
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (true);
 