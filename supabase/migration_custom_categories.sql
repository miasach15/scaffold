-- Lets each user rename, add, or remove their own categories (previously a fixed
-- Education/Personal/Health/People) — task/event category is already a free-text
-- column, so this just changes what's offered as options, not any existing data.
alter table profiles add column if not exists category_keys text[];
