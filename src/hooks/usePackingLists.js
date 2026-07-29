import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const itemFromRow = (row) => ({ id: row.id, title: row.title, packed: row.packed });
const listFromRow = (row) => ({
  id: row.id,
  title: row.title,
  items: (row.packing_list_items || [])
    .slice()
    .sort((a, b) => a.created_at?.localeCompare(b.created_at))
    .map(itemFromRow),
});

export function usePackingLists(userId) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("packing_lists")
      .select("*, packing_list_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLists((data || []).map(listFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addList = useCallback(
    async (title) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, title: tt };
      setLists((ls) => [{ ...row, items: [] }, ...ls]);
      await supabase.from("packing_lists").insert(row);
    },
    [userId]
  );

  const removeList = useCallback(async (listId) => {
    setLists((ls) => ls.filter((l) => l.id !== listId));
    await supabase.from("packing_lists").delete().eq("id", listId);
  }, []);

  const addItem = useCallback(
    async (listId, title) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, list_id: listId, title: tt, packed: false };
      setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: [...l.items, itemFromRow(row)] })));
      await supabase.from("packing_list_items").insert(row);
    },
    [userId]
  );

  const setItemPacked = useCallback(async (listId, itemId, packed) => {
    setLists((ls) => ls.map((l) => l.id !== listId ? l : {
      ...l,
      items: l.items.map((it) => (it.id === itemId ? { ...it, packed } : it)),
    }));
    await supabase.from("packing_list_items").update({ packed }).eq("id", itemId);
  }, []);

  const removeItem = useCallback(async (listId, itemId) => {
    setLists((ls) => ls.map((l) => (l.id !== listId ? l : { ...l, items: l.items.filter((it) => it.id !== itemId) })));
    await supabase.from("packing_list_items").delete().eq("id", itemId);
  }, []);

  return { lists, loading, addList, removeList, addItem, setItemPacked, removeItem };
}
