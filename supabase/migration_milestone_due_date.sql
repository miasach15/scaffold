-- Adds a target date to milestones, so setting it can auto-fill due dates
-- on that milestone's small actions that don't have one yet.
alter table milestones add column if not exists due_date date;
