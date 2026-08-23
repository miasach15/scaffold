import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Logs which top-level section you open (Calendar, Tasks, Goals, ...) — coarse, aggregate
// usage data so the app owner can see which parts of the app actually get used. Never
// logs what you type, click on within a page, or any of your actual content — just
// "user X opened Goals at time Y". See supabase/migration_usage_events.sql for the table,
// and the app's Privacy Policy for what this is disclosed as.
export function useUsageTracking(userId, view) {
  const last = useRef(null);
  useEffect(() => {
    if (!userId || !view || last.current === view) return;
    last.current = view;
    supabase.from("usage_events").insert({ user_id: userId, event: `view:${view}` }).then(() => {});
  }, [userId, view]);
}
