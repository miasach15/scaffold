-- Lets a category count its scored items either by adding the raw points up (the
-- existing, still-default behavior: sum(earned)/sum(possible)) or by averaging each
-- item's own percentage instead — these diverge whenever items in the category have
-- unequal point totals (e.g. a 1-point quiz and a 100-point test).
alter table grade_categories add column if not exists score_mode text not null default 'sum';
