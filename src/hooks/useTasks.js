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
  priority: row.priority || "Low",
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
    async ({ title, date = null, start = null, duration = null, priority = "Low", eduId = null }) => {
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
        priority,
      };
      setTasks((ts) => [...ts, fromRow(row)]);
      await supabase.from("tasks").insert(row);
      return row.id;
    },
    [userId]
  );

  const toggleTaskDone = useCallback(async (id) => {
    let nextDone;
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      nextDone = !t.done;
      return { ...t, done: nextDone };
    }));
    await supabase.from("tasks").update({ done: nextDone }).eq("id", id);
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

  return { tasks, loading, addTask, toggleTaskDone, removeTask, removeTasksByEduId, rescheduleTask };
}
