-- Lets a task carry a "days needed" number alongside its due date. Instead of only
-- showing up once it's due, the task stays visible every day and flips to an "urgent"
-- highlight once you're within that many days of the due date.
alter table tasks add column if not exists lead_days integer;
