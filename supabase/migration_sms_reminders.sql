-- Adds the two columns Text Reminders needs: the phone number to send to, and whether
-- the user has actually turned the feature on. Both nullable/false by default so nothing
-- changes for anyone who hasn't opted in.
--
-- Run this once in the Supabase SQL Editor before deploying the send-sms-digest and
-- receive-sms Edge Functions.

alter table profiles add column if not exists phone_number text;
alter table profiles add column if not exists sms_reminders_enabled boolean not null default false;

-- receive-sms needs to look a user up by their phone number (an inbound text's "From"),
-- so this needs to be quick and — since it's how we decide whose account a text writes
-- into — unique. NULLs are always allowed to repeat under a unique index, so this doesn't
-- block everyone who hasn't set a number yet.
create unique index if not exists profiles_phone_number_key on profiles (phone_number) where phone_number is not null;
