-- Schedules the send-daily-agenda Edge Function to run once a day, emailing today's
-- schedule (timed tasks/events, anything untimed due today, anything carried over) to
-- whoever's in that function's ALLOWED_EMAILS list — currently just
-- miasachdev15@gmail.com, on purpose, while this is still being tried out. Deploy the
-- function FIRST:
--   supabase functions deploy send-daily-agenda
-- and make sure RESEND_API_KEY is already set (same secret send-welcome-email uses).
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.
--
-- Runs at 12:00 UTC by default — change the '0 12 * * *' schedule below to whatever
-- hour lands in the morning for your timezone (cron time is UTC, not local). This used
-- to run alongside send-daily-digest as two separate emails, but that's since been
-- retired (see migration_retire_daily_digest_cron.sql) — this one covers everything it
-- did plus more, so there's no reason to keep both.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-daily-agenda') where exists (select 1 from cron.job where jobname = 'scaffold-daily-agenda');

select cron.schedule(
  'scaffold-daily-agenda',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-daily-agenda',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
