-- Lets "Anytime today" tasks be manually reordered on Dashboard instead of always
-- sorting by date — the same order_index pattern goal_actions already uses.
alter table tasks add column if not exists order_index integer;
