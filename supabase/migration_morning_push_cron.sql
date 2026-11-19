-- Schedules the send-morning-push Edge Function every 15 minutes — the function itself
-- checks each user's own local hour against their morning_push_hour and only actually
-- sends once, the first tick on/after that hour each day (morning_push_last_sent gates
-- the repeat). Deploy the function FIRST:
--   supabase functions deploy send-morning-push
-- Run migration_morning_push.sql before this, and make sure the same VAPID/APNs secrets
-- send-whatnow-push already uses are set (this function reuses them).
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-morning-push') where exists (select 1 from cron.job where jobname = 'scaffold-morning-push');

select cron.schedule(
  'scaffold-morning-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-morning-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
