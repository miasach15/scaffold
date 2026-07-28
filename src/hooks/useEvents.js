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

  return { events, loading, addEvents };
}
