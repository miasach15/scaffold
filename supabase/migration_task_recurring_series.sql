-- Ties every occurrence of one recurring task (created via the "Repeats" option) to the
-- same series, so changing one occurrence's category can cascade to the whole series
-- instead of leaving siblings mismatched.
alter table tasks add column if not exists recurring_id uuid;
