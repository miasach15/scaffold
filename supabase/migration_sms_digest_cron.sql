-- Schedules the send-sms-digest Edge Function to run once a day, texting every user
-- who's turned on Text Reminders whatever's overdue or due today (tasks, Education
-- deadlines, goal actions) — or a short nudge to add something if their list is
-- completely empty. Deploy the function FIRST:
--   supabase functions deploy send-sms-digest
-- and make sure TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER secrets are
-- already set.
--
-- If `create extension pg_cron` errors with a permissions message, enable it from the
-- Supabase Dashboard instead: Database → Extensions → search "pg_cron" → Enable.
--
-- Runs at 13:00 UTC by default (an hour after the email digest) — change the
-- '0 13 * * *' schedule below to whatever hour lands in the morning for your timezone
-- (cron time is UTC, not local).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('scaffold-sms-digest') where exists (select 1 from cron.job where jobname = 'scaffold-sms-digest');

select cron.schedule(
  'scaffold-sms-digest',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-sms-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := '{}'::jsonb
  );
  $$
);
