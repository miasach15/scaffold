-- Real, synced persistence for the mini-steps packed into a single task's notes field
-- (e.g. "Work on: latin project" with steps like "Choose and research passage" comma-
-- joined in notes — see StepNotes.jsx). Checking one off used to only write to
-- localStorage, so it never followed a task across devices or reloads on a different
-- browser profile. Now it's a real column, synced like everything else.
alter table tasks add column if not exists checked_steps text[] not null default '{}';
