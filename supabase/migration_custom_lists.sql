-- Adds user-named custom lists ("Movies to watch", "Restaurants to go to", or anything
-- else) on top of the base schema.sql. Run this once in the Supabase SQL editor after
-- schema.sql has already been applied. Safe to re-run.

create table if not exists custom_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists custom_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references custom_lists(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table custom_lists enable row level security;
alter table custom_list_items enable row level security;

drop policy if exists "own custom_lists" on custom_lists;
create policy "own custom_lists" on custom_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own custom_list_items" on custom_list_items;
create policy "own custom_list_items" on custom_list_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
