import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { distributeDates, toISO } from "../lib/dateHelpers";

const actionFromRow = (row) => ({ id: row.id, title: row.title, dueDate: row.due_date, done: row.done });
const milestoneFromRow = (row) => ({
  id: row.id,
  title: row.title,
  dueDate: row.due_date,
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
      if (!userId || !title.trim()) return null;
      const row = { id: uid(), user_id: userId, title: title.trim(), category, deadline: deadline || null };
      setGoals((gs) => [...gs, { ...row, milestones: [] }]);
      await supabase.from("goals").insert(row);
      return row.id;
    },
    [userId]
  );

  const removeGoal = useCallback(async (goalId) => {
    setGoals((gs) => gs.filter((g) => g.id !== goalId));
    await supabase.from("goals").delete().eq("id", goalId);
  }, []);

  const renameGoal = useCallback(async (goalId, title) => {
    if (!title.trim()) return;
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, title: title.trim() })));
    await supabase.from("goals").update({ title: title.trim() }).eq("id", goalId);
  }, []);

  const addMilestone = useCallback(
    async (goalId, title) => {
      if (!userId || !title.trim()) return null;
      const row = { id: uid(), user_id: userId, goal_id: goalId, title: title.trim() };
      setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: [...g.milestones, { ...row, actions: [] }] })));
      await supabase.from("milestones").insert(row);
      return row.id;
    },
    [userId]
  );

  const removeMilestone = useCallback(async (goalId, milestoneId) => {
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) })));
    await supabase.from("milestones").delete().eq("id", milestoneId);
  }, []);

  const renameMilestone = useCallback(async (goalId, milestoneId, title) => {
    if (!title.trim()) return;
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => (m.id !== milestoneId ? m : { ...m, title: title.trim() })),
    })));
    await supabase.from("milestones").update({ title: title.trim() }).eq("id", milestoneId);
  }, []);

  // Setting/changing a milestone's target date auto-fills due dates on any of its
  // actions that don't have one yet, spreading them evenly up to that date.
  const setMilestoneDueDate = useCallback(async (goalId, milestoneId, dueDate) => {
    const goal = goals.find((g) => g.id === goalId);
    const milestone = goal?.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    const undated = milestone.actions.filter((a) => !a.dueDate);
    const dateForAction = new Map();
    if (dueDate && undated.length > 0) {
      const todayISO = toISO(new Date());
      const startISO = dueDate > todayISO ? todayISO : dueDate;
      const autoDates = distributeDates(startISO, dueDate, undated.length);
      undated.forEach((a, i) => dateForAction.set(a.id, autoDates[i]));
    }

    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => (m.id !== milestoneId ? m : {
        ...m,
        dueDate: dueDate || null,
        actions: m.actions.map((a) => (dateForAction.has(a.id) ? { ...a, dueDate: dateForAction.get(a.id) } : a)),
      })),
    })));

    await supabase.from("milestones").update({ due_date: dueDate || null }).eq("id", milestoneId);
    for (const [actionId, d] of dateForAction) {
      await supabase.from("goal_actions").update({ due_date: d }).eq("id", actionId);
    }
  }, [goals]);

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

  const setActionDone = useCallback(async (goalId, milestoneId, actionId, done) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => (a.id === actionId ? { ...a, done } : a)),
      }),
    }));
    await supabase.from("goal_actions").update({ done }).eq("id", actionId);
  }, []);

  const removeAction = useCallback(async (goalId, milestoneId, actionId) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: m.actions.filter((a) => a.id !== actionId) }),
    }));
    await supabase.from("goal_actions").delete().eq("id", actionId);
  }, []);

  const setActionDueDate = useCallback(async (goalId, milestoneId, actionId, dueDate) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => (a.id === actionId ? { ...a, dueDate: dueDate || null } : a)),
      }),
    }));
    await supabase.from("goal_actions").update({ due_date: dueDate || null }).eq("id", actionId);
  }, []);

  const renameAction = useCallback(async (goalId, milestoneId, actionId, title) => {
    if (!title.trim()) return;
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => (a.id === actionId ? { ...a, title: title.trim() } : a)),
      }),
    }));
    await supabase.from("goal_actions").update({ title: title.trim() }).eq("id", actionId);
  }, []);

  return { goals, loading, addGoal, removeGoal, renameGoal, addMilestone, removeMilestone, renameMilestone, setMilestoneDueDate, addAction, setActionDone, removeAction, renameAction, setActionDueDate };
}
