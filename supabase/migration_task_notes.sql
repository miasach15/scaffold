-- When a "break it down" breakdown packs more than one step onto the same day, the task
-- keeps a short title (just the first step) and the rest goes here instead of getting
-- jammed into the title as "+N more".
alter table tasks add column if not exists notes text;
