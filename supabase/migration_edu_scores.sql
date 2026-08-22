-- Optional score tracking for Education items — points earned / points possible (works
-- for percentage grades too: just use possible = 100). Both null until you enter one.
alter table edu_items add column if not exists score_earned numeric;
alter table edu_items add column if not exists score_possible numeric;
