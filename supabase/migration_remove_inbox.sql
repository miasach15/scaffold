-- Removes the "Quick capture" / inbox feature entirely (its only entry point, the
-- floating sticky note, is gone from the app) — drops the table and everything in it.
--
-- ⚠️ Destructive: this permanently deletes any notes still sitting in Quick capture
-- that were never turned into a task or discarded. Back up first (Settings → Download
-- a backup of everything) if you want to keep them. Safe to skip running this at all —
-- the app no longer reads or writes this table either way, so leaving it in place is
-- harmless, just unused.

drop table if exists inbox_items;
