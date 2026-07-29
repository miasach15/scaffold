import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  color: row.color,
  pinned: row.pinned,
});

export function useNotes(userId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setNotes((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = useCallback(
    async (title, body, color) => {
      const bb = body.trim();
      if (!userId || !bb) return;
      const row = { id: uid(), user_id: userId, title: title.trim() || null, body: bb, color, pinned: false };
      setNotes((ns) => [fromRow(row), ...ns]);
      await supabase.from("notes").insert(row);
    },
    [userId]
  );

  const setPinned = useCallback(async (id, pinned) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, pinned } : n)));
    await supabase.from("notes").update({ pinned }).eq("id", id);
  }, []);

  const removeNote = useCallback(async (id) => {
    setNotes((ns) => ns.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  }, []);

  return { notes, loading, addNote, setPinned, removeNote };
}
