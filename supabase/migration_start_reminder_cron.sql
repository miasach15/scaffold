-- Schedules the send-start-reminder-push Edge Function every minute — "time to start"
-- notifications are tied to the exact minute a task/event starts, so (unlike the
-- 15-minute "What now?" cron) this one needs to tick every minute to not miss it.
-- Deploy the function FIRST:
--   supabase functions deploy send-start-reminder-push
-- Run migration_start_reminders.sql before this, and make sure the same VAPID/APNs
-- secrets send-whatnow-push already uses are set (this function reuses them).
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-start-reminder-push') where exists (select 1 from cron.job where jobname = 'scaffold-start-reminder-push');

select cron.schedule(
  'scaffold-start-reminder-push',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-start-reminder-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
