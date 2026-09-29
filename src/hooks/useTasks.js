import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";

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
  orderIndex: row.order_index == null ? null : Number(row.order_index),
  actualMinutes: row.actual_minutes == null ? null : Number(row.actual_minutes),
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
    async ({ title, date = null, start = null, duration = null, category = "Personal", eduId = null, groupId = null, groupTitle = null, groupDueDate = null, groupDueStart = null, leadDays = null, notes = null }) => {
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
      };
      setTasks((ts) => [...ts, fromRow(row)]);
      const { error } = await supabase.from("tasks").insert(row);
      if (error) reportSaveError();
      return row.id;
    },
    [userId]
  );

  // actualMinutes is only ever passed when a focus session finishes a task — it's how
  // long that session actually ran, not an estimate. Left undefined for every other way
  // a task gets checked off (nothing real to record), so it's never overwritten with a
  // guess.
  const setTaskDone = useCallback(async (id, done, actualMinutes) => {
    const hasActual = actualMinutes !== undefined;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done, ...(hasActual ? { actualMinutes } : {}) } : t)));
    const { error } = await supabase.from("tasks").update(hasActual ? { done, actual_minutes: actualMinutes } : { done }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const setTaskCategory = useCallback(async (id, category) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, category } : t)));
    const { error } = await supabase.from("tasks").update({ category }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const renameTask = useCallback(async (id, title) => {
    if (!title.trim()) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title: title.trim() } : t)));
    const { error } = await supabase.from("tasks").update({ title: title.trim() }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const setTaskDate = useCallback(async (id, date) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, date: date || null } : t)));
    const { error } = await supabase.from("tasks").update({ date: date || null }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // Setting a specific time is what actually makes a task "due at" that time — it's what
  // moves it from the Due/Tasks strip into a real timed block on the calendar grid, same
  // as if you'd set it when the task was first created. Clearing the time clears the
  // block entirely; picking a first time defaults its length to 60, but nudging the time
  // on a task that already has a real duration (see setTaskDuration) keeps that length
  // instead of silently resetting it back to 60.
  const setTaskStart = useCallback(async (id, start) => {
    let duration = null;
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      duration = start == null ? null : (t.duration ?? 60);
      return { ...t, start, duration };
    }));
    const { error } = await supabase.from("tasks").update({ start, duration }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // Adjusts just the length of an already-timed task's block — see setTaskStart above
  // for why the two are kept separate instead of duration always trailing along with
  // whatever last set the start time.
  const setTaskDuration = useCallback(async (id, duration) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, duration } : t)));
    const { error } = await supabase.from("tasks").update({ duration }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // Updates the shared due date/time across every row in a "break it down" group — the
  // group's own deadline, not any individual step's work day. See TasksView.jsx's
  // reflowGroupDueDate, which calls this and then re-dates the not-done steps to match.
  const setGroupDueDate = useCallback(async (groupId, date, start) => {
    let previous;
    setTasks((ts) => ts.map((t) => {
      if (t.groupId !== groupId) return t;
      previous ||= { groupDueDate: t.groupDueDate, groupDueStart: t.groupDueStart };
      return { ...t, groupDueDate: date, groupDueStart: start };
    }));
    const { error } = await supabase.from("tasks").update({ group_due_date: date, group_due_start: start }).eq("group_id", groupId);
    if (error) {
      reportSaveError();
      if (previous) {
        console.error("Failed to save group due date — reverting:", error);
        setTasks((ts) => ts.map((t) => (t.groupId === groupId ? { ...t, ...previous } : t)));
      }
    }
  }, []);

  const setTaskNotes = useCallback(async (id, notes) => {
    const trimmed = notes && notes.trim() ? notes.trim() : null;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, notes: trimmed } : t)));
    const { error } = await supabase.from("tasks").update({ notes: trimmed }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  // Persists a manual order for whatever set of tasks is currently on screen (e.g.
  // Dashboard's "Anytime today" list) — same order_index pattern goal_actions already
  // uses. Takes the FULL list of ids in their new order (not a single move + direction)
  // since the "scope" to reorder within is computed client-side (today's visible tasks),
  // not a stored grouping like a milestone_id — simplest to just write sequential indexes
  // for the whole visible set on every move, same as moveAction's own reindex-everything
  // behavior after a single swap.
  const reorderTasks = useCallback(async (orderedIds) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    setTasks((ts) => ts.map((t) => (orderMap.has(t.id) ? { ...t, orderIndex: orderMap.get(t.id) } : t)));
    const results = await Promise.all(orderedIds.map((id, i) => supabase.from("tasks").update({ order_index: i }).eq("id", id)));
    if (results.some((r) => r.error)) reportSaveError();
  }, []);

  const removeTask = useCallback(async (id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) reportSaveError();
  }, []);

  const removeTasksByEduId = useCallback(async (eduId) => {
    setTasks((ts) => ts.filter((t) => t.eduId !== eduId));
    // handled server-side too via ON DELETE CASCADE on edu_id
  }, []);

  const rescheduleTask = useCallback(async (taskId, dateISO, hour) => {
    const start = hour == null ? null : hour;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, date: dateISO, start } : t)));
    const { error } = await supabase.from("tasks").update({ date: dateISO, start }).eq("id", taskId);
    if (error) reportSaveError();
  }, []);

  // Renaming a category (see App.jsx's renameCategory) only touched the category list
  // itself — every task already tagged with the old name silently fell back to a
  // default color and dropped out of the filter dropdown instead of following the
  // rename. This carries every matching task over to the new name.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setTasks((ts) => ts.map((t) => (t.category === oldKey ? { ...t, category: newKey } : t)));
    const { error } = await supabase.from("tasks").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
    if (error) reportSaveError();
  }, [userId]);

  return { tasks, loading, addTask, setTaskDone, setTaskCategory, renameTask, setTaskDate, setTaskStart, setTaskDuration, setTaskNotes, removeTask, removeTasksByEduId, rescheduleTask, reorderTasks, renameCategoryEverywhere, setGroupDueDate };
}
