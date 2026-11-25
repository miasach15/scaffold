-- Marks an Education item as belonging to the NEXT term even though it's showing up
-- (and may already be due, or scored) before the current term has actually been ended
-- (see grade_classes.current_term_started_at / useGrades' endTerm) — e.g. a new
-- assignment posted for next semester while this semester's grade is still open.
-- Flagged items are excluded from the current term's grade the same way an item dated
-- before the term boundary is; ending the term clears the flag on everything in that
-- class, since the boundary itself now covers them correctly going forward.
alter table edu_items add column if not exists next_term boolean not null default false;
