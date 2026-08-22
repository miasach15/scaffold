-- Native APNs push tokens (the App Store build), separate from push_subscriptions
-- (Web Push, used by the browser/PWA install) since the two are structurally different.

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'ios',
  token text not null unique,
  timezone text not null default 'UTC',
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table device_push_tokens enable row level security;

drop policy if exists "own device_push_tokens" on device_push_tokens;
create policy "own device_push_tokens" on device_push_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
