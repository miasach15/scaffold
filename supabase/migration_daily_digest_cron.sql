-- Schedules the send-daily-digest Edge Function to run once a day, emailing every user
-- whatever's overdue or due today (tasks, Education deadlines, goal actions) — skipped
-- entirely for a user if nothing's due. Deploy the function FIRST:
--   supabase functions deploy send-daily-digest
-- and make sure RESEND_API_KEY is already set (same secret send-welcome-email uses).
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.
--
-- Runs at 12:00 UTC by default — change the '0 12 * * *' schedule below to whatever
-- hour lands in the morning for your timezone (cron time is UTC, not local).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-daily-digest') where exists (select 1 from cron.job where jobname = 'scaffold-daily-digest');

select cron.schedule(
  'scaffold-daily-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
