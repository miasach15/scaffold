-- Adds the theme_color column used by the new Settings / color theme picker.
-- Run this once in the Supabase SQL editor. Safe to re-run.

alter table profiles add column if not exists theme_color text not null default 'violet';
