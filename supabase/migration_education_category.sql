-- Tracks which of the user's own categories currently plays the "Education" role,
-- independent of what it's actually named — lets the category be renamed (e.g. to
-- "School") without breaking the Education/Grades pages' color, or Today/notifications'
-- "Education stuff first" priority sort, both of which used to hardcode the literal
-- string "Education".
alter table profiles add column if not exists education_category text not null default 'Education';
