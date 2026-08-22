-- Schedules the send-whatnow-push Edge Function to run every 15 minutes. The function
-- itself checks each subscribed device's own interval/quiet-hours settings and only
-- actually sends a notification when that device is due for one — this cron just needs
-- to tick often enough that no device's window is missed. Deploy the function FIRST:
--   supabase functions deploy send-whatnow-push
-- and make sure VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT secrets are set
-- (see the comment at the top of supabase/functions/send-whatnow-push/index.ts).
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-whatnow-push') where exists (select 1 from cron.job where jobname = 'scaffold-whatnow-push');

select cron.schedule(
  'scaffold-whatnow-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-whatnow-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
