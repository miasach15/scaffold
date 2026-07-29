-- Adds the optional "lifestyle" pages (Movies/TV, Books, Restaurants, Bucket List,
-- Packing Lists, Gifts, Notes) on top of the base schema.sql. Run this once in the
-- Supabase SQL editor after schema.sql has already been applied. Safe to re-run.

alter table profiles add column if not exists enabled_pages text[] not null default '{}';

-- ---------- movies / tv ----------
create table if not exists watch_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'Movie', -- Movie | TV Show
  status text not null default 'Want to watch', -- Want to watch | Watched
  rating int,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- books ----------
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  status text not null default 'Want to read', -- Want to read | Reading | Read
  rating int,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- restaurants ----------
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cuisine text,
  status text not null default 'Want to try', -- Want to try | Tried
  rating int,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- bucket list ----------
create table if not exists bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- packing lists ----------
create table if not exists packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists packing_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references packing_lists(id) on delete cascade,
  title text not null,
  packed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- gift tracking ----------
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  occasion text,
  idea text not null,
  status text not null default 'Idea', -- Idea | Bought | Wrapped | Given
  price numeric,
  created_at timestamptz not null default now()
);

-- ---------- notes ----------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null,
  color text not null default 'yellow',
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table watch_items enable row level security;
alter table books enable row level security;
alter table restaurants enable row level security;
alter table bucket_list_items enable row level security;
alter table packing_lists enable row level security;
alter table packing_list_items enable row level security;
alter table gifts enable row level security;
alter table notes enable row level security;

drop policy if exists "own watch_items" on watch_items;
create policy "own watch_items" on watch_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own books" on books;
create policy "own books" on books for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own restaurants" on restaurants;
create policy "own restaurants" on restaurants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own bucket_list_items" on bucket_list_items;
create policy "own bucket_list_items" on bucket_list_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own packing_lists" on packing_lists;
create policy "own packing_lists" on packing_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own packing_list_items" on packing_list_items;
create policy "own packing_list_items" on packing_list_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own gifts" on gifts;
create policy "own gifts" on gifts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own notes" on notes;
create policy "own notes" on notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
