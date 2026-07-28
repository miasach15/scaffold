import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const actionFromRow = (row) => ({ id: row.id, title: row.title, dueDate: row.due_date, done: row.done });
const milestoneFromRow = (row) => ({
  id: row.id,
  title: row.title,
  actions: (row.goal_actions || [])
    .slice()
    .sort((a, b) => a.created_at?.localeCompare(b.created_at))
    .map(actionFromRow),
});
const goalFromRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  deadline: row.deadline,
  milestones: (row.milestones || [])
    .slice()
    .sort((a, b) => a.created_at?.localeCompare(b.created_at))
    .map(milestoneFromRow),
});

export function useGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*, milestones(*, goal_actions(*))")
      .eq("user_id", userId)
      .order("created_at");
    setGoals((data || []).map(goalFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addGoal = useCallback(
    async (title, category, deadline = null) => {
      if (!userId || !title.trim()) return;
      const row = { id: uid(), user_id: userId, title: title.trim(), category, deadline: deadline || null };
      setGoals((gs) => [...gs, { ...row, milestones: [] }]);
      await supabase.from("goals").insert(row);
    },
    [userId]
  );

  const removeGoal = useCallback(async (goalId) => {
    setGoals((gs) => gs.filter((g) => g.id !== goalId));
    await supabase.from("goals").delete().eq("id", goalId);
  }, []);

  const addMilestone = useCallback(
    async (goalId, title) => {
      if (!userId || !title.trim()) return;
      const row = { id: uid(), user_id: userId, goal_id: goalId, title: title.trim() };
      setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: [...g.milestones, { ...row, actions: [] }] })));
      await supabase.from("milestones").insert(row);
    },
    [userId]
  );

  const removeMilestone = useCallback(async (goalId, milestoneId) => {
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) })));
    await supabase.from("milestones").delete().eq("id", milestoneId);
  }, []);

  const addAction = useCallback(
    async (goalId, milestoneId, title, dueDate) => {
      if (!userId || !title.trim()) return;
      const row = { id: uid(), user_id: userId, milestone_id: milestoneId, title: title.trim(), due_date: dueDate || null, done: false };
      setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
        ...g,
        milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: [...m.actions, actionFromRow(row)] }),
      }));
      await supabase.from("goal_actions").insert(row);
    },
    [userId]
  );

  const toggleAction = useCallback(async (goalId, milestoneId, actionId) => {
    let nextDone;
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => {
          if (a.id !== actionId) return a;
          nextDone = !a.done;
          return { ...a, done: nextDone };
        }),
      }),
    }));
    await supabase.from("goal_actions").update({ done: nextDone }).eq("id", actionId);
  }, []);

  const removeAction = useCallback(async (goalId, milestoneId, actionId) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: m.actions.filter((a) => a.id !== actionId) }),
    }));
    await supabase.from("goal_actions").delete().eq("id", actionId);
  }, []);

  return { goals, loading, addGoal, removeGoal, addMilestone, removeMilestone, addAction, toggleAction, removeAction };
}
