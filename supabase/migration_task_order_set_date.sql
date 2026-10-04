-- Tracks WHEN a task's manual order_index was last set, so Dashboard's "Anytime today"
-- sort can tell a fresh drag from a stale one. Without this, a task dragged once keeps
-- outranking every other task by due date forever — a brand-new, due-today task added a
-- week later still loses to a years-old manual position from a day it doesn't even
-- matter on anymore. Only a drag from TODAY should override the normal due-date sort;
-- anything older falls back to sorting by date like it was never dragged at all.

alter table tasks add column if not exists order_set_date date;
