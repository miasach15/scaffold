-- Adds the tour_seen column used to show the guided page tour once, right
-- after onboarding. Run once in the Supabase SQL editor. Safe to re-run.

alter table profiles add column if not exists tour_seen boolean not null default false;
