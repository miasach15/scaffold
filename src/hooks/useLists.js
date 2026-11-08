import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";

const itemFromRow = (row) => ({ id: row.id, text: row.text, done: row.done });
const listFromRow = (row) => ({
  id: row.id,
  title: row.title,
  items: (row.custom_list_items || [])
    .slice()
    .sort((a, b) => a.created_at?.localeCompare(b.created_at))
    .map(itemFromRow),
});

// User-named lists of their own choosing ("Movies to watch", "Restaurants to go to",
// whatever else) — one flexible table pair instead of a fixed page per list type.
export function useLists(userId) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("custom_lists")
      .select("*, custom_list_items(*)")
      .eq("user_id", userId)
      .order("created_at");
    setLists((data || []).map(listFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addList = useCallback(
    async (title) => {
      const tt = title.trim();
      if (!userId || !tt) return null;
      const row = { id: uid(), user_id: userId, title: tt };
      setLists((ls) => [...ls, { ...row, items: [] }]);
      const { error } = await supabase.from("custom_lists").insert(row);
      if (error) reportSaveError();
      return row.id;
    },
    [userId]
  );

  const removeList = useCallback(async (listId) => {
    setLists((ls) => ls.filter((l) => l.id !== listId));
    const { error } = await supabase.from("custom_lists").delete().eq("id", listId);
    if (error) reportSaveError();
  }, []);

  const renameList = useCallback(async (listId, title) => {
    if (!title.trim()) return;
    setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, title: title.trim() })));
    const { error } = await supabase.from("custom_lists").update({ title: title.trim() }).eq("id", listId);
    if (error) reportSaveError();
  }, []);

  const addItem = useCallback(
    async (listId, text) => {
      const tt = text.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, list_id: listId, text: tt, done: false };
      setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: [...l.items, itemFromRow(row)] })));
      const { error } = await supabase.from("custom_list_items").insert(row);
      if (error) reportSaveError();
    },
    [userId]
  );

  const setItemDone = useCallback(async (listId, itemId, done) => {
    setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done } : i)) })));
    const { error } = await supabase.from("custom_list_items").update({ done }).eq("id", itemId);
    if (error) reportSaveError();
  }, []);

  const removeItem = useCallback(async (listId, itemId) => {
    setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: l.items.filter((i) => i.id !== itemId) })));
    const { error } = await supabase.from("custom_list_items").delete().eq("id", itemId);
    if (error) reportSaveError();
  }, []);

  const renameItem = useCallback(async (listId, itemId, text) => {
    if (!text.trim()) return;
    setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, text: text.trim() } : i)) })));
    const { error } = await supabase.from("custom_list_items").update({ text: text.trim() }).eq("id", itemId);
    if (error) reportSaveError();
  }, []);

  return { lists, loading, addList, removeList, renameList, addItem, setItemDone, removeItem, renameItem };
}
