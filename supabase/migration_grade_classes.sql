-- Turns Grades into its own customizable-per-class system. Each class (matched to
-- edu_items.subject by name) can either grade by raw point totals, or be divided into
-- weighted categories (Tests 40%, Homework 20%, etc.) with each graded item assigned to
-- one category.

create table if not exists grade_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  -- 'points': overall % = sum(earned) / sum(possible) across every scored item.
  -- 'weighted': overall % = weighted average of each category's own points-weighted %.
  grading_mode text not null default 'points',
  created_at timestamptz not null default now(),
  unique (user_id, subject)
);

create table if not exists grade_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references grade_classes(id) on delete cascade,
  name text not null,
  weight numeric not null default 0, -- percent, only used in 'weighted' mode
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- which category (if any) a graded item counts toward, in a weighted class
alter table edu_items add column if not exists grade_category_id uuid references grade_categories(id) on delete set null;

alter table grade_classes enable row level security;
alter table grade_categories enable row level security;

drop policy if exists "own grade_classes" on grade_classes;
create policy "own grade_classes" on grade_classes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own grade_categories" on grade_categories;
create policy "own grade_categories" on grade_categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
