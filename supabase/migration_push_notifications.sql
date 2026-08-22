-- "What now?" push notifications: periodically nudges you toward whatever's most worth
-- doing right now, sent to your phone/desktop via the Web Push API.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  -- IANA zone (e.g. "America/New_York") captured at subscribe time, so the quiet-hours
  -- window below is checked in the user's own local time, not the server's.
  timezone text not null default 'UTC',
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists whatnow_notifications boolean not null default false;
alter table profiles add column if not exists whatnow_interval_minutes integer not null default 60;
alter table profiles add column if not exists whatnow_window_start integer not null default 8;  -- local hour, 0-23
alter table profiles add column if not exists whatnow_window_end integer not null default 21;    -- local hour, 0-23

alter table push_subscriptions enable row level security;

drop policy if exists "own push_subscriptions" on push_subscriptions;
create policy "own push_subscriptions" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
