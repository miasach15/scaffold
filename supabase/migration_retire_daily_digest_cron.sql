-- Retires send-daily-digest, superseded by send-daily-agenda (a richer version of the
-- same idea — chronological schedule + priorities + tomorrow preview, not just a flat
-- "what's due" list — see migration_daily_agenda_cron.sql). Safe to run whether or not
-- migration_daily_digest_cron.sql was ever actually run: the `where exists` guard makes
-- the unschedule a no-op if that job was never scheduled in the first place.
--
-- Run this in the SQL Editor, THEN delete the deployed function itself:
--   supabase functions delete send-daily-digest
-- (the function code has already been removed from this repo — see
-- supabase/functions/send-daily-digest/ in git history if you ever need to look at it
-- again).

select cron.unschedule('scaffold-daily-digest') where exists (select 1 from cron.job where jobname = 'scaffold-daily-digest');
