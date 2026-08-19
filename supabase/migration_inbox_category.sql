-- Quick Capture now lets you pick a category at capture time, kept for when you turn
-- an inbox item into a real task.
alter table inbox_items add column if not exists category text not null default 'Personal';
