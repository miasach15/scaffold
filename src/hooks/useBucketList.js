import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  done: row.done,
});

export function useBucketList(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("bucket_list_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = useCallback(
    async (title, category) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, title: tt, category: category.trim() || null, done: false };
      setItems((its) => [fromRow(row), ...its]);
      await supabase.from("bucket_list_items").insert(row);
    },
    [userId]
  );

  const setDone = useCallback(async (id, done) => {
    setItems((its) => its.map((it) => (it.id === id ? { ...it, done } : it)));
    await supabase.from("bucket_list_items").update({ done }).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id) => {
    setItems((its) => its.filter((it) => it.id !== id));
    await supabase.from("bucket_list_items").delete().eq("id", id);
  }, []);

  return { items, loading, addItem, setDone, removeItem };
}
