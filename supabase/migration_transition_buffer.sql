-- A second, smaller buffer alongside the existing after_school_buffer_minutes — that one
-- models a single energy dip at the start of the day's window; this one is the small
-- transition every individual fixed commitment actually needs around it (walking out of
-- one meeting/class and into the next thing, prep time, decompression), not just once in
-- the morning. Used by Dashboard's "done around X" and free-time math.

alter table profiles add column if not exists transition_buffer_minutes integer not null default 0;
