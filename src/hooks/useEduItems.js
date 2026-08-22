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
  scoreEarned: row.score_earned == null ? null : Number(row.score_earned),
  scorePossible: row.score_possible == null ? null : Number(row.score_possible),
  gradeCategoryId: row.grade_category_id,
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

  // occurrences: array of due-date ISO strings. Returns the inserted rows (id + due_date)
  // so callers can schedule linked work sessions off the real generated ids.
  const addEduItems = useCallback(
    async ({ title, type, subject, occurrences }) => {
      if (!userId || !title.trim() || occurrences.length === 0) return [];
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
      return rows.map((r) => ({ id: r.id, dueDate: r.due_date }));
    },
    [userId]
  );

  const setDone = useCallback(async (id, done) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, done } : x)));
    await supabase.from("edu_items").update({ done }).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id) => {
    setEduItems((e) => e.filter((x) => x.id !== id));
    await supabase.from("edu_items").delete().eq("id", id); // cascades to linked tasks server-side
  }, []);

  // Either value can be null to clear it — e.g. entering just "18" out of nothing yet,
  // or clearing a mis-entered score back to blank.
  const setScore = useCallback(async (id, scoreEarned, scorePossible) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, scoreEarned, scorePossible } : x)));
    await supabase.from("edu_items").update({ score_earned: scoreEarned, score_possible: scorePossible }).eq("id", id);
  }, []);

  // categoryId null = "no category" (excluded from a weighted class's percent until assigned)
  const setGradeCategory = useCallback(async (id, categoryId) => {
    setEduItems((e) => e.map((x) => (x.id === id ? { ...x, gradeCategoryId: categoryId } : x)));
    await supabase.from("edu_items").update({ grade_category_id: categoryId }).eq("id", id);
  }, []);

  return { eduItems, loading, addEduItems, setDone, removeItem, setScore, setGradeCategory };
}
