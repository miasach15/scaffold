-- Adds the category_colors column used by the Settings > Category Colors picker
-- (lets each user re-color Education / Personal / Health / People). Run once in
-- the Supabase SQL editor. Safe to re-run.

alter table profiles add column if not exists category_colors jsonb not null default '{}'::jsonb;
