-- Capacity-aware scheduling settings.
--
-- pace_multiplier: one honest setting covering BOTH "I personally take longer to read/
-- write than the estimate" and formal extended-time accommodations, rather than asking
-- a student to separate the two. Applied to a session's own estimated duration and to
-- how much room the scheduler thinks a day actually has.
--
-- after_school_buffer_minutes: energy dip + commute/transition time right when the
-- day's active window opens (see profiles.whatnow_window_start) — shifts the effective
-- start of scheduling later by this many minutes instead of assuming the window opens
-- at full capacity the moment it starts.
--
-- edu_items.flexible: "this deadline can move if it needs to" — a soft deadline is
-- scheduled the same way today, but its own urgency softens instead of spiking once
-- it's close/overdue, since missing it by a day isn't the same as missing a fixed one.
--
-- Run this once in the Supabase SQL editor. Safe to re-run.
alter table profiles add column if not exists pace_multiplier numeric not null default 1;
alter table profiles add column if not exists after_school_buffer_minutes integer not null default 0;
alter table edu_items add column if not exists flexible boolean not null default false;
