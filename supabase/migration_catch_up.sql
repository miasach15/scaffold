-- Catch-up migration: bundles every pending migration into one file.
-- Run once in the Supabase SQL editor. Safe to re-run (each line is a no-op
-- if the column already exists).

alter table profiles add column if not exists theme_color text not null default 'violet';
alter table profiles add column if not exists category_colors jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists tour_seen boolean not null default false;
alter table tasks add column if not exists category text not null default 'Personal';
