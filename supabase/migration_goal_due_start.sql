-- Adds an optional time-of-day to a goal's own deadline and to a milestone's due date,
-- same decimal-hour convention as tasks.start / tasks.group_due_start / edu_items.due_start
-- (e.g. 14.5 = 2:30pm). Null means "just a day", same as before this migration — a goal
-- action's own due_date deliberately doesn't get one; actions are day-to-day steps that
-- never render on Calendar, unlike a goal's own deadline or a milestone's due date.
alter table goals add column if not exists deadline_start numeric;
alter table milestones add column if not exists due_start numeric;
