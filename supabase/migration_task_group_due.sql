-- Gives a "break it down" group its own overall due date/time (separate from each
-- step's own work-day date), so the group shows up in the calendar's "Due" row the same
-- way a plain task or Education deadline does, while its steps stay in "Tasks".
alter table tasks add column if not exists group_due_date date;
alter table tasks add column if not exists group_due_start numeric;
