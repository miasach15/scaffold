import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Every data hook (useTasks, useEduItems, useGoals, ...) used to load its rows once on
// mount and never again — a change made on your phone just sat in the database until
// whatever other tab/device you had open happened to get fully reloaded. This subscribes
// to Postgres changes on the given tables (filtered to this user's own rows, same
// `user_id` every RLS policy already scopes by) and re-runs `reload` whenever another
// device writes something, so every open device converges on the same data within a
// moment of the write actually happening — no manual refresh needed.
//
// Realtime sockets don't survive a phone backgrounding/locking indefinitely, so this also
// re-runs `reload` whenever the tab/app regains focus or visibility — the fallback that
// catches whatever a dropped-and-silently-not-yet-reconnected socket missed.
export function useRealtimeSync(tables, userId, reload, filterColumn = "user_id") {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!userId) return;

    let debounceTimer = null;
    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => reloadRef.current(), 150);
    };

    const channel = supabase.channel(`sync-${tables.join("-")}-${userId}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${userId}` },
        triggerReload
      );
    }
    channel.subscribe();

    const onFocusOrVisible = () => {
      if (document.visibilityState === "hidden") return;
      triggerReload();
    };
    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("focus", onFocusOrVisible);

    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("focus", onFocusOrVisible);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tables` is a plain array literal from the caller, stable in practice (same call site every render)
  }, [userId, tables.join(",")]);
}
