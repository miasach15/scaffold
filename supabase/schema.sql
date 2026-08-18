-- Scaffold app schema. Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses "create table if not exists" and drops/recreates policies.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  focus_areas text[] not null default '{}',
  work_style text not null default 'Mix of both',
  onboarded boolean not null default false,
  enabled_pages text[] not null default '{}',
  theme_color text not null default 'violet',
  category_colors jsonb not null default '{}'::jsonb,
  tour_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- events ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  start numeric,
  duration numeric,
  category text not null default 'Personal',
  created_at timestamptz not null default now()
);

-- ---------- edu_items (must exist before tasks, which reference it) ----------
create table if not exists edu_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'Assignment',
  subject text,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date,
  start numeric,
  duration numeric,
  done boolean not null default false,
  edu_id uuid references edu_items(id) on delete cascade,
  priority text not null default 'Low',
  category text not null default 'Personal',
  created_at timestamptz not null default now()
);

-- ---------- goals / milestones / actions ----------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Personal',
  deadline date,
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  title text not null,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists goal_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_id uuid not null references milestones(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- habits ----------
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists habit_done_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  unique (habit_id, date)
);

-- ---------- journal ----------
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  prompt text,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------- lifestyle pages (optional, toggled per-user via profiles.enabled_pages) ----------
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

create table if not exists bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

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
alter table profiles enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table goals enable row level security;
alter table milestones enable row level security;
alter table goal_actions enable row level security;
alter table habits enable row level security;
alter table habit_done_dates enable row level security;
alter table edu_items enable row level security;
alter table journal_entries enable row level security;
alter table watch_items enable row level security;
alter table books enable row level security;
alter table restaurants enable row level security;
alter table bucket_list_items enable row level security;
alter table packing_lists enable row level security;
alter table packing_list_items enable row level security;
alter table gifts enable row level security;
alter table notes enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own events" on events;
create policy "own events" on events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tasks" on tasks;
create policy "own tasks" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own goals" on goals;
create policy "own goals" on goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own milestones" on milestones;
create policy "own milestones" on milestones for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own goal_actions" on goal_actions;
create policy "own goal_actions" on goal_actions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own habits" on habits;
create policy "own habits" on habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own habit_done_dates" on habit_done_dates;
create policy "own habit_done_dates" on habit_done_dates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own edu_items" on edu_items;
create policy "own edu_items" on edu_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own journal_entries" on journal_entries;
create policy "own journal_entries" on journal_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

-- auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
