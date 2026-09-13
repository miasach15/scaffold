-- Usage-frequency queries for usage_events (see migration_usage_events.sql for the
-- table itself). Run these in the Supabase Dashboard's SQL Editor — as the project
-- owner there, you see every user's rows regardless of the table's own row-level
-- security policy (that policy only limits what a signed-in user of the APP itself can
-- query through the client, so a normal user can only ever see their own activity).
--
-- Auth's "Users" list only shows the most recent sign-in per person, which is why it
-- can't answer "how many times a day do they actually use it" — usage_events logs an
-- event every time the app is opened or navigated to a different page, so it's the
-- right table for that.

-- 1) Simplest view: how many page-opens happened per person, per day.
-- Counts every "view:X" row, so someone who bounces between five pages in one sitting
-- shows up as 5 here, not 1 — good for a rough "how active are they today" number, not
-- for "how many separate times did they open the app."
select
  user_id,
  date_trunc('day', created_at) as day,
  count(*) as page_opens
from usage_events
group by user_id, day
order by day desc, page_opens desc;

-- 2) Closer to "how many times a day do they use it": groups events into sessions,
-- where a new session starts whenever more than 30 minutes pass with no activity from
-- that person. That 30-minute gap is a judgment call (a common default for this kind of
-- session heuristic) — change the interval below if you want a stricter or looser cutoff.
with gaps as (
  select
    user_id,
    created_at,
    created_at - lag(created_at) over (partition by user_id order by created_at) as gap_since_prev
  from usage_events
),
sessions as (
  select
    user_id,
    created_at,
    sum(case when gap_since_prev is null or gap_since_prev > interval '30 minutes' then 1 else 0 end)
      over (partition by user_id order by created_at) as session_id
  from gaps
)
select
  user_id,
  date_trunc('day', created_at) as day,
  count(distinct session_id) as sessions_that_day
from sessions
group by user_id, day
order by day desc, sessions_that_day desc;

-- 3) Same session logic as #2, but rolled up across everyone — a daily "how many times
-- was the app opened, in total, across all users" trend line.
with gaps as (
  select
    user_id,
    created_at,
    created_at - lag(created_at) over (partition by user_id order by created_at) as gap_since_prev
  from usage_events
),
sessions as (
  select
    user_id,
    created_at,
    sum(case when gap_since_prev is null or gap_since_prev > interval '30 minutes' then 1 else 0 end)
      over (partition by user_id order by created_at) as session_id
  from gaps
)
select
  date_trunc('day', created_at) as day,
  count(distinct (user_id, session_id)) as total_sessions
from sessions
group by day
order by day desc;

-- 4) One person's usage for the last 14 days, both metrics side by side — useful for
-- checking in on a specific user (e.g. yourself, while testing).
-- Replace the uuid below with the user_id from Authentication > Users.
with gaps as (
  select
    user_id,
    created_at,
    created_at - lag(created_at) over (partition by user_id order by created_at) as gap_since_prev
  from usage_events
  where user_id = '00000000-0000-0000-0000-000000000000' -- <- replace with the real user_id
),
sessions as (
  select
    created_at,
    sum(case when gap_since_prev is null or gap_since_prev > interval '30 minutes' then 1 else 0 end)
      over (order by created_at) as session_id
  from gaps
)
select
  date_trunc('day', created_at) as day,
  count(*) as page_opens,
  count(distinct session_id) as sessions_that_day
from sessions
group by day
order by day desc
limit 14;
