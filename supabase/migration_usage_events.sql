-- Coarse, aggregate usage tracking — which top-level section (Calendar, Tasks, Goals,
-- etc) a user opens, and when. Deliberately does NOT log what anyone types, enters, or
-- clicks inside a page — just "user X opened Goals at time Y". Lets the app owner see
-- which parts of the app actually get used, via SQL queries in the Supabase dashboard
-- (see the queries in the accompanying chat message / README).

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null, -- e.g. "view:calendar", "view:goals"
  created_at timestamptz not null default now()
);

alter table usage_events enable row level security;

drop policy if exists "own usage_events" on usage_events;
create policy "own usage_events" on usage_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
