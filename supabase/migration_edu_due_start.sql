-- Adds an optional time-of-day to an Education deadline, same decimal-hour convention
-- as tasks.start / tasks.group_due_start (e.g. 14.5 = 2:30pm). Null means "just a day",
-- same as before this migration.
alter table edu_items add column if not exists due_start numeric;
