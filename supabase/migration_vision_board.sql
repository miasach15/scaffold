-- A personal vision board — a handful of photos pinned to Goals for whatever you're
-- actually working toward. Public bucket (simplest way to just show an <img src> without
-- juggling signed URLs) but every object still lives under a per-user folder
-- (storage_path = '<user_id>/<filename>') and only that user can add/remove their own —
-- see the storage.objects policies below.

insert into storage.buckets (id, name, public)
values ('vision-board', 'vision-board', true)
on conflict (id) do nothing;

create table if not exists vision_board_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table vision_board_items enable row level security;

drop policy if exists "own vision_board_items" on vision_board_items;
create policy "own vision_board_items" on vision_board_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage RLS: anyone can view (the bucket is public anyway, but this also covers the
-- authenticated API path), only the owner (first folder segment of the path = their own
-- user id) can upload or delete their own photos.
drop policy if exists "vision-board public read" on storage.objects;
create policy "vision-board public read" on storage.objects for select
  using (bucket_id = 'vision-board');

drop policy if exists "vision-board owner insert" on storage.objects;
create policy "vision-board owner insert" on storage.objects for insert
  with check (bucket_id = 'vision-board' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vision-board owner delete" on storage.objects;
create policy "vision-board owner delete" on storage.objects for delete
  using (bucket_id = 'vision-board' and (storage.foldername(name))[1] = auth.uid()::text);
