-- Lets a class's end-of-term projection also roll up into an end-of-year projection.
-- Both are optional: left blank, "end of year" just falls back to "end of term" (treating
-- whatever's currently on the calendar as the whole picture). Filled in, the year
-- projection blends this term's own projected grade with how earlier terms already went.

alter table grade_classes add column if not exists term_weight_percent numeric; -- what % of the year grade this term is worth (e.g. 25 for one quarter of 4)
alter table grade_classes add column if not exists prior_terms_grade numeric; -- average % across whatever terms are already finished this year
