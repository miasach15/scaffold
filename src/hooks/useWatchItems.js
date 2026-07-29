import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  status: row.status,
  rating: row.rating,
  notes: row.notes,
});

export function useWatchItems(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("watch_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = useCallback(
    async (title, type) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, title: tt, type, status: "Want to watch" };
      setItems((its) => [fromRow(row), ...its]);
      await supabase.from("watch_items").insert(row);
    },
    [userId]
  );

  const setWatched = useCallback(async (id, watched) => {
    const nextStatus = watched ? "Watched" : "Want to watch";
    setItems((its) => its.map((it) => (it.id === id ? { ...it, status: nextStatus } : it)));
    await supabase.from("watch_items").update({ status: nextStatus }).eq("id", id);
  }, []);

  const setRating = useCallback(async (id, rating) => {
    setItems((its) => its.map((it) => (it.id === id ? { ...it, rating } : it)));
    await supabase.from("watch_items").update({ rating }).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id) => {
    setItems((its) => its.filter((it) => it.id !== id));
    await supabase.from("watch_items").delete().eq("id", id);
  }, []);

  return { items, loading, addItem, setWatched, setRating, removeItem };
}
