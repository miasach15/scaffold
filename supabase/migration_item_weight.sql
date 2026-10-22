-- Lets a single graded item carry its own weight (e.g. "this one final is 20% of the
-- class") instead of needing to belong to a named weighted category. Mutually exclusive
-- with grade_category_id — the app clears whichever one isn't being used — so a weighted
-- class's grade can mix named categories and standalone-weighted items freely.

alter table edu_items add column if not exists item_weight numeric;
