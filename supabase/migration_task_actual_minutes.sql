-- Adds a place to record how long a task ACTUALLY took, separate from `duration` (the
-- estimate). Only ever set when a Focus Session finishes a task — that's the one moment
-- the app knows real elapsed time, as opposed to a task just checked off a list — so this
-- stays null for everything else rather than guessing. Powers Weekly Review's "how close
-- were your estimates" insight.

alter table tasks add column if not exists actual_minutes integer;
