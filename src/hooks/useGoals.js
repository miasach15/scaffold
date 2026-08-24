import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { dayBefore, distributeDatesByLoad, toISO } from "../lib/dateHelpers";

const actionFromRow = (row) => ({ id: row.id, title: row.title, dueDate: row.due_date, done: row.done, orderIndex: row.order_index });
const milestoneFromRow = (row) => ({
  id: row.id,
  title: row.title,
  dueDate: row.due_date,
  actions: (row.goal_actions || [])
    .slice()
    .sort((a, b) => {
      // existing rows may not have an order_index yet — fall back to creation order for those
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      if (a.order_index != null) return -1;
      if (b.order_index != null) return 1;
      return a.created_at?.localeCompare(b.created_at);
    })
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

export function useGoals(userId, tasks, events) {
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
      // Work leads up to the milestone's due date but never lands on it — you shouldn't
      // still be working the day it's due.
      const lastWorkDay = dayBefore(dueDate);
      const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
      const autoDates = distributeDatesByLoad(startISO, endISO, undated.length, tasks, events);
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
  }, [goals, tasks, events]);

  // One end date for the whole goal, and everything undated underneath cascades from it:
  // any milestone that doesn't already have its own due date gets one spread evenly (load-
  // aware) up to the goal's deadline, and then — same rule setMilestoneDueDate already
  // uses for a single milestone — every milestone that now has a date (whether it already
  // had one or just got assigned one here) has its own undated actions spread up to that.
  // Anything that already has a date of its own is left alone.
  const setGoalDeadline = useCallback(async (goalId, deadline) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const todayISO = toISO(new Date());
    const undatedMilestones = goal.milestones.filter((m) => !m.dueDate);
    const milestoneDateFor = new Map();
    if (deadline && undatedMilestones.length > 0) {
      const startISO = deadline > todayISO ? todayISO : deadline;
      const lastWorkDay = dayBefore(deadline);
      const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
      const autoDates = distributeDatesByLoad(startISO, endISO, undatedMilestones.length, tasks, events);
      undatedMilestones.forEach((m, i) => milestoneDateFor.set(m.id, autoDates[i]));
    }

    const actionDateFor = new Map();
    goal.milestones.forEach((m) => {
      const mDueDate = milestoneDateFor.get(m.id) || m.dueDate;
      const undatedActions = m.actions.filter((a) => !a.dueDate);
      if (!mDueDate || undatedActions.length === 0) return;
      const startISO = mDueDate > todayISO ? todayISO : mDueDate;
      const lastWorkDay = dayBefore(mDueDate);
      const endISO = lastWorkDay < startISO ? startISO : lastWorkDay;
      const autoDates = distributeDatesByLoad(startISO, endISO, undatedActions.length, tasks, events);
      undatedActions.forEach((a, i) => actionDateFor.set(a.id, autoDates[i]));
    });

    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      deadline: deadline || null,
      milestones: g.milestones.map((m) => ({
        ...m,
        dueDate: milestoneDateFor.get(m.id) || m.dueDate,
        actions: m.actions.map((a) => (actionDateFor.has(a.id) ? { ...a, dueDate: actionDateFor.get(a.id) } : a)),
      })),
    })));

    await supabase.from("goals").update({ deadline: deadline || null }).eq("id", goalId);
    for (const [milestoneId, d] of milestoneDateFor) {
      await supabase.from("milestones").update({ due_date: d }).eq("id", milestoneId);
    }
    for (const [actionId, d] of actionDateFor) {
      await supabase.from("goal_actions").update({ due_date: d }).eq("id", actionId);
    }
  }, [goals, tasks, events]);

  const addAction = useCallback(
    async (goalId, milestoneId, title, dueDate) => {
      if (!userId || !title.trim()) return;
      const goal = goals.find((g) => g.id === goalId);
      const milestone = goal?.milestones.find((m) => m.id === milestoneId);
      const orderIndex = milestone ? milestone.actions.length : 0;
      const row = { id: uid(), user_id: userId, milestone_id: milestoneId, title: title.trim(), due_date: dueDate || null, done: false, order_index: orderIndex };
      setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
        ...g,
        milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: [...m.actions, actionFromRow(row)] }),
      }));
      await supabase.from("goal_actions").insert(row);
    },
    [userId, goals]
  );

  // Swaps an action with its neighbor above/below and re-persists sequential
  // order_index values for the whole milestone so future loads keep the order.
  const moveAction = useCallback(async (goalId, milestoneId, actionId, direction) => {
    const goal = goals.find((g) => g.id === goalId);
    const milestone = goal?.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;
    const idx = milestone.actions.findIndex((a) => a.id === actionId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= milestone.actions.length) return;

    const reordered = milestone.actions.slice();
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const reindexed = reordered.map((a, i) => ({ ...a, orderIndex: i }));

    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: reindexed }),
    }));

    await Promise.all(reindexed.map((a) => supabase.from("goal_actions").update({ order_index: a.orderIndex }).eq("id", a.id)));
  }, [goals]);

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

  // See useTasks' renameCategoryEverywhere — carries every goal already tagged with the
  // old category name over to the new one.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setGoals((gs) => gs.map((g) => (g.category === oldKey ? { ...g, category: newKey } : g)));
    await supabase.from("goals").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
  }, [userId]);

  return { goals, loading, addGoal, removeGoal, renameGoal, setGoalDeadline, addMilestone, removeMilestone, renameMilestone, setMilestoneDueDate, addAction, moveAction, setActionDone, removeAction, renameAction, setActionDueDate, renameCategoryEverywhere };
}
