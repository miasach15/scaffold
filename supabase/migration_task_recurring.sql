-- Marks a task instance as one occurrence of a recurring series (created via the
-- "Repeats" option), so the automatic "urgent 2 days before due" default can exclude
-- it — a recurring task is an expected routine, not a surprise creeping up, so every
-- daily occurrence showing "Urgent" at once would just be noise.
alter table tasks add column if not exists is_recurring boolean not null default false;
