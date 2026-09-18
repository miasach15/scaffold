-- Removes task recurrence entirely. Tasks are one-off now — a chore or routine that
-- comes back on its own schedule belongs in Habits instead (that's a separate system;
-- this doesn't touch it). Reverses migration_task_recurring.sql and
-- migration_task_recurring_series.sql, which added these two columns.
--
-- Safe to run even if a "Repeats" task was created before this: the columns (and
-- whatever data was in them) are just gone — every existing task, including old
-- recurring occurrences, keeps its own title/date/done state and behaves as a normal
-- one-off task from here on. Nothing else reads or writes these columns anymore.

alter table tasks drop column if exists is_recurring;
alter table tasks drop column if exists recurring_id;
