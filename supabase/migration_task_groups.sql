-- Ties together the individual steps of a "break it down" task so the Tasks list can
-- show one collapsed row (with a dropdown to reveal the steps) instead of a row per step.
alter table tasks add column if not exists group_id uuid;
alter table tasks add column if not exists group_title text;
