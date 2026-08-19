-- Quick Capture: a zero-friction jot-it-down-now list, reviewed later and turned into
-- a real task (or discarded) from the Tasks page.
create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table inbox_items enable row level security;

drop policy if exists "own inbox_items" on inbox_items;
create policy "own inbox_items" on inbox_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
