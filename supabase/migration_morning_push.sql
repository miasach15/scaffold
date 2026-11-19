-- "Good morning" push notification: once a day, at a local hour you pick, a push
-- summarizing what's on your plate today — the push equivalent of send-daily-agenda's
-- email, for people who want it on their phone instead of (or as well as) their inbox.
-- Reuses the same push_subscriptions/device_push_tokens tables and VAPID/APNs secrets
-- send-whatnow-push already uses.
--
-- Deploy with:  supabase functions deploy send-morning-push
-- Then schedule it with migration_morning_push_cron.sql.

alter table profiles add column if not exists morning_push boolean not null default false;
alter table profiles add column if not exists morning_push_hour integer not null default 7; -- local hour, 0-23
-- The local calendar date (in the user's own timezone) this was last sent on — not a
-- timestamp, so "already sent today" is a simple equality check regardless of what time
-- within that day it went out.
alter table profiles add column if not exists morning_push_last_sent date;
