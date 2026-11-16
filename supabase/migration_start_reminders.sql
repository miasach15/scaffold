-- "Time to start" push notifications: fires right when a timed task or event's
-- scheduled start time arrives, separate from the periodic "What now?" nudges (see
-- migration_push_notifications.sql) — this one isn't on an interval or a quiet-hours
-- window, it's tied to the exact minute something on the calendar begins. Reuses the
-- same push_subscriptions/device_push_tokens tables and the same VAPID/APNs secrets as
-- send-whatnow-push; only start_reminder_log and the profiles column below are new.
--
-- Deploy with:  supabase functions deploy send-start-reminder-push
-- Then schedule it with migration_start_reminder_cron.sql.

alter table profiles add column if not exists start_reminders boolean not null default false;

-- One row per (item, the exact scheduled moment it was due to start) that's already
-- been notified — not a per-task boolean, so rescheduling a task's date/start just
-- changes the key and is free to notify again, with no flag to remember to clear.
create table if not exists start_reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task', 'event')),
  item_id uuid not null,
  scheduled_date date not null,
  scheduled_start numeric not null,
  sent_at timestamptz not null default now(),
  unique (kind, item_id, scheduled_date, scheduled_start)
);

alter table start_reminder_log enable row level security;

drop policy if exists "own start_reminder_log" on start_reminder_log;
create policy "own start_reminder_log" on start_reminder_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
