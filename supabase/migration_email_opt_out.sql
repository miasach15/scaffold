-- Lets a user unsubscribe from Scaffold's automated emails (welcome, getting-started,
-- daily agenda) via the link in each one's footer. Every sender function checks this
-- before sending; see supabase/functions/unsubscribe for where it gets flipped on.

alter table profiles add column if not exists email_opt_out boolean not null default false;
