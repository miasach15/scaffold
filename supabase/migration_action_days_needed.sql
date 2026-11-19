-- How many calendar days an action realistically needs, not just how long one focused
-- session on it takes — "write a 10-day curriculum guide" eats several real days even
-- though no single sitting is that long. Used purely for spacing: when actions get
-- auto-dated up to a milestone/goal deadline (see distributeDatesByLoad's weights),
-- a bigger action claims proportionally more of the available runway before its due
-- date instead of every action getting an equal one-day slice. Null (the default, and
-- true for every action added by hand or from before this existed) is treated as 1 day.
alter table goal_actions add column if not exists days_needed integer;
