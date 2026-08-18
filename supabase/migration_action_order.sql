-- Lets small actions under a milestone be manually reordered instead of always
-- showing in creation order.
alter table goal_actions add column if not exists order_index integer;
