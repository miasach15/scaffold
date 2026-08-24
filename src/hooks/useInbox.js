import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({ id: row.id, text: row.text, category: row.category || "Personal", createdAt: row.created_at });

// Quick Capture: jot something down instantly with no date/category prompt, review it
// later and either turn it into a real task or discard it (see TasksView's Inbox section).
export function useInbox(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("inbox_items").select("*").eq("user_id", userId).order("created_at");
    setItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = useCallback(
    async (text, category = "Personal") => {
      if (!userId || !text.trim()) return;
      const row = { id: uid(), user_id: userId, text: text.trim(), category };
      setItems((its) => [...its, fromRow(row)]);
      await supabase.from("inbox_items").insert(row);
    },
    [userId]
  );

  const removeItem = useCallback(async (id) => {
    setItems((its) => its.filter((it) => it.id !== id));
    await supabase.from("inbox_items").delete().eq("id", id);
  }, []);

  // See useTasks' renameCategoryEverywhere — carries every inbox item already tagged
  // with the old category name over to the new one.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setItems((its) => its.map((it) => (it.category === oldKey ? { ...it, category: newKey } : it)));
    await supabase.from("inbox_items").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
  }, [userId]);

  return { items, loading, addItem, removeItem, renameCategoryEverywhere };
}
