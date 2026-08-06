-- Adds the category column used to tag tasks with Education/Personal/Health/People
-- (replaces the old Low/Medium/Urgent priority picker in the Tasks page UI).
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table tasks add column if not exists category text not null default 'Personal';
