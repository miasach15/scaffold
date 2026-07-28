import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  subject: row.subject,
  dueDate: row.due_date,
  done: row.done,
});

export function useEduItems(userId) {
  const [eduItems, setEduItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("edu_items").select("*").eq("user_id", userId).order("due_date");
    setEduItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // occurrences: array of due-date ISO strings
  const addEduItems = useCallback(
    async ({ title, type, subject, occurrences }) => {
      if (!userId || !title.trim() || occurrences.length === 0) return;
      const rows = occurrences.map((d) => ({
        id: uid(),
        user_id: userId,
        title: title.trim(),
        type,
        subject: subject.trim() || null,
        due_date: d,
        done: false,
      }));
      setEduItems((e) => [...e, ...rows.map(fromRow)]);
      await supabase.from("edu_items").insert(rows);
    },
    [userId]
  );

  const toggleDone = useCallback(async (id) => {
    let nextDone;
    setEduItems((e) => e.map((x) => {
      if (x.id !== id) return x;
      nextDone = !x.done;
      return { ...x, done: nextDone };
    }));
    await supabase.from("edu_items").update({ done: nextDone }).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id) => {
    setEduItems((e) => e.filter((x) => x.id !== id));
    await supabase.from("edu_items").delete().eq("id", id); // cascades to linked tasks server-side
  }, []);

  return { eduItems, loading, addEduItems, toggleDone, removeItem };
}
