import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { toISO } from "../lib/dateHelpers";

const fromRow = (row) => ({
  id: row.id,
  date: row.date,
  createdAt: new Date(row.created_at).getTime(),
  prompt: row.prompt,
  text: row.text,
});

export function useJournal(userId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setEntries((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = useCallback(
    async (prompt, text) => {
      if (!userId || !text.trim()) return;
      const nowIso = new Date().toISOString();
      const row = { id: uid(), user_id: userId, date: toISO(new Date()), created_at: nowIso, prompt: prompt || null, text: text.trim() };
      setEntries((es) => [fromRow(row), ...es]);
      await supabase.from("journal_entries").insert(row);
    },
    [userId]
  );

  const removeEntry = useCallback(async (id) => {
    setEntries((es) => es.filter((e) => e.id !== id));
    await supabase.from("journal_entries").delete().eq("id", id);
  }, []);

  return { entries, loading, addEntry, removeEntry };
}
