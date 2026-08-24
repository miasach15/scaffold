import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  date: row.date,
  start: row.start === null ? null : Number(row.start),
  duration: row.duration === null ? null : Number(row.duration),
  done: row.done,
  eduId: row.edu_id,
  category: row.category || "Personal",
  groupId: row.group_id || null,
  groupTitle: row.group_title || null,
  groupDueDate: row.group_due_date || null,
  groupDueStart: row.group_due_start == null ? null : Number(row.group_due_start),
  leadDays: row.lead_days == null ? null : Number(row.lead_days),
  notes: row.notes || null,
  isRecurring: !!row.is_recurring,
  recurringId: row.recurring_id || null,
});

export function useTasks(userId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).order("created_at");
    setTasks((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = useCallback(
    async ({ title, date = null, start = null, duration = null, category = "Personal", eduId = null, groupId = null, groupTitle = null, groupDueDate = null, groupDueStart = null, leadDays = null, notes = null, isRecurring = false, recurringId = null }) => {
      if (!userId) return;
      const row = {
        id: uid(),
        user_id: userId,
        title,
        date,
        start,
        duration,
        done: false,
        edu_id: eduId,
        category,
        group_id: groupId,
        group_title: groupTitle,
        group_due_date: groupDueDate,
        group_due_start: groupDueStart,
        lead_days: leadDays,
        notes,
        is_recurring: isRecurring,
        recurring_id: recurringId,
      };
      setTasks((ts) => [...ts, fromRow(row)]);
      await supabase.from("tasks").insert(row);
      return row.id;
    },
    [userId]
  );

  const setTaskDone = useCallback(async (id, done) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
    await supabase.from("tasks").update({ done }).eq("id", id);
  }, []);

  // Changing one occurrence of a recurring task's category cascades to every occurrence
  // in that series — otherwise a "study every day" recurring task would end up with a
  // different color per day the moment you recategorized any single instance, which
  // reads as a mistake rather than "here's the whole series' new category."
  const setTaskCategory = useCallback(
    async (id, category) => {
      const task = tasks.find((t) => t.id === id);
      const recurringId = task?.recurringId;
      setTasks((ts) => ts.map((t) => (t.id === id || (recurringId && t.recurringId === recurringId) ? { ...t, category } : t)));
      if (recurringId) {
        await supabase.from("tasks").update({ category }).eq("recurring_id", recurringId);
      } else {
        await supabase.from("tasks").update({ category }).eq("id", id);
      }
    },
    [tasks]
  );

  const renameTask = useCallback(async (id, title) => {
    if (!title.trim()) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title: title.trim() } : t)));
    await supabase.from("tasks").update({ title: title.trim() }).eq("id", id);
  }, []);

  const setTaskDate = useCallback(async (id, date) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, date: date || null } : t)));
    await supabase.from("tasks").update({ date: date || null }).eq("id", id);
  }, []);

  // Setting a specific time is what actually makes a task "due at" that time — it's what
  // moves it from the Due/Tasks strip into a real timed block on the calendar grid, same
  // as if you'd set it when the task was first created.
  const setTaskStart = useCallback(async (id, start) => {
    const duration = start == null ? null : 60;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, start, duration } : t)));
    await supabase.from("tasks").update({ start, duration }).eq("id", id);
  }, []);

  const setTaskNotes = useCallback(async (id, notes) => {
    const trimmed = notes && notes.trim() ? notes.trim() : null;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, notes: trimmed } : t)));
    await supabase.from("tasks").update({ notes: trimmed }).eq("id", id);
  }, []);

  const removeTask = useCallback(async (id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  }, []);

  const removeTasksByEduId = useCallback(async (eduId) => {
    setTasks((ts) => ts.filter((t) => t.eduId !== eduId));
    // handled server-side too via ON DELETE CASCADE on edu_id
  }, []);

  const rescheduleTask = useCallback(async (taskId, dateISO, hour) => {
    const start = hour == null ? null : hour;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, date: dateISO, start } : t)));
    await supabase.from("tasks").update({ date: dateISO, start }).eq("id", taskId);
  }, []);

  // Renaming a category (see App.jsx's renameCategory) only touched the category list
  // itself — every task already tagged with the old name silently fell back to a
  // default color and dropped out of the filter dropdown instead of following the
  // rename. This carries every matching task over to the new name.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setTasks((ts) => ts.map((t) => (t.category === oldKey ? { ...t, category: newKey } : t)));
    await supabase.from("tasks").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
  }, [userId]);

  return { tasks, loading, addTask, setTaskDone, setTaskCategory, renameTask, setTaskDate, setTaskStart, setTaskNotes, removeTask, removeTasksByEduId, rescheduleTask, renameCategoryEverywhere };
}
