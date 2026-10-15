-- Lets a class's grade be "ended" for the term it's in and started fresh for a new one,
-- instead of accumulating every assignment ever into one running average forever.
-- grade_terms is a simple archive: each row is one past term's final grade, kept for your
-- own reference. grade_classes.current_term_started_at marks where the ACTIVE term began -
-- only items due on or after that date count toward the class's current grade; anything
-- before it belongs to an already-ended term. Left null (the default, and true for every
-- existing class), everything still counts, same as before this ever existed.

alter table grade_classes add column if not exists current_term_started_at date;

create table if not exists grade_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references grade_classes(id) on delete cascade,
  label text, -- optional, e.g. "Semester 1" - just a note to yourself
  final_percent numeric not null, -- the real grade as of the moment this term was ended, not a guess
  started_at date, -- null if the class had no boundary before this (its very first term)
  ended_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table grade_terms enable row level security;

drop policy if exists "own grade_terms" on grade_terms;
create policy "own grade_terms" on grade_terms for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
