import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  date: row.date,
  start: row.start === null ? null : Number(row.start),
  duration: row.duration === null ? null : Number(row.duration),
  category: row.category,
});

export function useEvents(userId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("events").select("*").eq("user_id", userId).order("date");
    setEvents((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // occurrences: array of {title, date, start, duration, category}
  const addEvents = useCallback(
    async (occurrences) => {
      if (!userId || occurrences.length === 0) return;
      const rows = occurrences.map((o) => ({
        id: uid(),
        user_id: userId,
        title: o.title,
        date: o.date,
        start: o.start,
        duration: o.duration,
        category: o.category || "Personal",
      }));
      setEvents((es) => [...es, ...rows.map(fromRow)]);
      await supabase.from("events").insert(rows);
    },
    [userId]
  );

  const updateEvent = useCallback(async (id, patch) => {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const dbPatch = {};
    if ("title" in patch) dbPatch.title = patch.title;
    if ("date" in patch) dbPatch.date = patch.date;
    if ("start" in patch) dbPatch.start = patch.start;
    if ("duration" in patch) dbPatch.duration = patch.duration;
    if ("category" in patch) dbPatch.category = patch.category;
    await supabase.from("events").update(dbPatch).eq("id", id);
  }, []);

  const removeEvent = useCallback(async (id) => {
    setEvents((es) => es.filter((e) => e.id !== id));
    await supabase.from("events").delete().eq("id", id);
  }, []);

  // See useTasks' renameCategoryEverywhere — same idea, carries every event already
  // tagged with the old category name over to the new one instead of orphaning it.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setEvents((es) => es.map((e) => (e.category === oldKey ? { ...e, category: newKey } : e)));
    await supabase.from("events").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
  }, [userId]);

  return { events, loading, addEvents, updateEvent, removeEvent, renameCategoryEverywhere };
}
