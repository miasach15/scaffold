import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { dayBefore, distributeDatesByLoad, toISO } from "../lib/dateHelpers";
import { reportSaveError } from "../lib/saveErrors";
import { useRealtimeSync } from "./useRealtimeSync";

// Every write below used to call reportSaveError() bare on failure — the toast always
// said the same generic "check your connection" regardless of what actually went wrong,
// and the real Postgrest error was never logged anywhere, so a failure during something
// like the AI goal coach's rapid-fire batch of inserts (a goal, several milestones,
// a dozen+ actions) was impossible to diagnose after the fact. This logs the real error
// and surfaces its message instead.
function fail(label, error) {
  console.error(`${label} failed:`, error);
  reportSaveError(`Couldn't save that — ${error?.message || error?.code || "unknown error"}.`);
}

const actionFromRow = (row) => ({ id: row.id, title: row.title, dueDate: row.due_date, done: row.done, orderIndex: row.order_index, daysNeeded: row.days_needed });
const milestoneFromRow = (row) => ({
  id: row.id,
  title: row.title,
  dueDate: row.due_date,
  // Optional time-of-day the milestone is due, decimal hour like tasks.start (e.g. 14.5
  // = 2:30pm) — null means "just a day". See migration_goal_due_start.sql.
  dueStart: row.due_start == null ? null : Number(row.due_start),
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
  // Same convention as milestoneFromRow's dueStart. See migration_goal_due_start.sql.
  deadlineStart: row.deadline_start == null ? null : Number(row.deadline_start),
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
    const { data, error } = await supabase
      .from("goals")
      .select("*, milestones(*, goal_actions(*))")
      .eq("user_id", userId)
      .order("created_at");
    if (error) console.error("useGoals load failed:", error);
    setGoals((data || []).map(goalFromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeSync(["goals", "milestones", "goal_actions"], userId, load);

  const addGoal = useCallback(
    async (title, category, deadline = null) => {
      if (!userId || !title.trim()) return null;
      const row = { id: uid(), user_id: userId, title: title.trim(), category, deadline: deadline || null };
      setGoals((gs) => [...gs, { ...row, milestones: [] }]);
      const { error } = await supabase.from("goals").insert(row);
      if (error) fail("addGoal", error);
      return row.id;
    },
    [userId]
  );

  const removeGoal = useCallback(async (goalId) => {
    setGoals((gs) => gs.filter((g) => g.id !== goalId));
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    if (error) fail("removeGoal", error);
  }, []);

  const renameGoal = useCallback(async (goalId, title) => {
    if (!title.trim()) return;
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, title: title.trim() })));
    const { error } = await supabase.from("goals").update({ title: title.trim() }).eq("id", goalId);
    if (error) fail("renameGoal", error);
  }, []);

  const addMilestone = useCallback(
    async (goalId, title) => {
      if (!userId || !title.trim()) return null;
      const row = { id: uid(), user_id: userId, goal_id: goalId, title: title.trim() };
      setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: [...g.milestones, { ...row, actions: [] }] })));
      const { error } = await supabase.from("milestones").insert(row);
      if (error) fail("addMilestone", error);
      return row.id;
    },
    [userId]
  );

  const removeMilestone = useCallback(async (goalId, milestoneId) => {
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) })));
    const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
    if (error) fail("removeMilestone", error);
  }, []);

  const renameMilestone = useCallback(async (goalId, milestoneId, title) => {
    if (!title.trim()) return;
    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => (m.id !== milestoneId ? m : { ...m, title: title.trim() })),
    })));
    const { error } = await supabase.from("milestones").update({ title: title.trim() }).eq("id", milestoneId);
    if (error) fail("renameMilestone", error);
  }, []);

  // Setting/changing a milestone's target date auto-fills due dates on any of its
  // actions that don't have one yet, spreading them evenly up to that date.
  const setMilestoneDueDate = useCallback(async (goalId, milestoneId, dueDate, dueStart = null) => {
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
      // A bigger action (see goal_actions.days_needed) claims proportionally more of the
      // runway before its own due date instead of every action getting an equal slice —
      // keeps a multi-day action's due date from landing right on top of the next one's.
      const weights = undated.map((a) => a.daysNeeded || 1);
      const autoDates = distributeDatesByLoad(startISO, endISO, undated.length, tasks, events, null, weights);
      undated.forEach((a, i) => dateForAction.set(a.id, autoDates[i]));
    }

    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => (m.id !== milestoneId ? m : {
        ...m,
        dueDate: dueDate || null,
        dueStart,
        actions: m.actions.map((a) => (dateForAction.has(a.id) ? { ...a, dueDate: dateForAction.get(a.id) } : a)),
      })),
    })));

    const results = [await supabase.from("milestones").update({ due_date: dueDate || null, due_start: dueStart }).eq("id", milestoneId)];
    for (const [actionId, d] of dateForAction) {
      results.push(await supabase.from("goal_actions").update({ due_date: d }).eq("id", actionId));
    }
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) fail("setMilestoneDueDate", firstError);
  }, [goals, tasks, events]);

  // One end date for the whole goal, and everything undated underneath cascades from it:
  // any milestone that doesn't already have its own due date gets one spread evenly (load-
  // aware) up to the goal's deadline, and then — same rule setMilestoneDueDate already
  // uses for a single milestone — every milestone that now has a date (whether it already
  // had one or just got assigned one here) has its own undated actions spread up to that.
  // Anything that already has a date of its own is left alone.
  const setGoalDeadline = useCallback(async (goalId, deadline, deadlineStart = null) => {
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
      const weights = undatedActions.map((a) => a.daysNeeded || 1);
      const autoDates = distributeDatesByLoad(startISO, endISO, undatedActions.length, tasks, events, null, weights);
      undatedActions.forEach((a, i) => actionDateFor.set(a.id, autoDates[i]));
    });

    setGoals((gs) => gs.map((g) => (g.id !== goalId ? g : {
      ...g,
      deadline: deadline || null,
      deadlineStart,
      milestones: g.milestones.map((m) => ({
        ...m,
        dueDate: milestoneDateFor.get(m.id) || m.dueDate,
        actions: m.actions.map((a) => (actionDateFor.has(a.id) ? { ...a, dueDate: actionDateFor.get(a.id) } : a)),
      })),
    })));

    const results = [await supabase.from("goals").update({ deadline: deadline || null, deadline_start: deadlineStart }).eq("id", goalId)];
    for (const [milestoneId, d] of milestoneDateFor) {
      results.push(await supabase.from("milestones").update({ due_date: d }).eq("id", milestoneId));
    }
    for (const [actionId, d] of actionDateFor) {
      results.push(await supabase.from("goal_actions").update({ due_date: d }).eq("id", actionId));
    }
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) fail("setGoalDeadline", firstError);
  }, [goals, tasks, events]);

  const addAction = useCallback(
    async (goalId, milestoneId, title, dueDate, daysNeeded) => {
      if (!userId || !title.trim()) return;
      const goal = goals.find((g) => g.id === goalId);
      const milestone = goal?.milestones.find((m) => m.id === milestoneId);
      const orderIndex = milestone ? milestone.actions.length : 0;
      const row = {
        id: uid(), user_id: userId, milestone_id: milestoneId, title: title.trim(), due_date: dueDate || null, done: false, order_index: orderIndex,
        days_needed: daysNeeded > 0 ? Math.round(daysNeeded) : null,
      };
      setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
        ...g,
        milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: [...m.actions, actionFromRow(row)] }),
      }));
      const { error } = await supabase.from("goal_actions").insert(row);
      if (error) fail("addAction", error);
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

    const results = await Promise.all(reindexed.map((a) => supabase.from("goal_actions").update({ order_index: a.orderIndex }).eq("id", a.id)));
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) fail("moveAction", firstError);
  }, [goals]);

  const setActionDone = useCallback(async (goalId, milestoneId, actionId, done) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => (a.id === actionId ? { ...a, done } : a)),
      }),
    }));
    const { error } = await supabase.from("goal_actions").update({ done }).eq("id", actionId);
    if (error) fail("setActionDone", error);
  }, []);

  const removeAction = useCallback(async (goalId, milestoneId, actionId) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : { ...m, actions: m.actions.filter((a) => a.id !== actionId) }),
    }));
    const { error } = await supabase.from("goal_actions").delete().eq("id", actionId);
    if (error) fail("removeAction", error);
  }, []);

  const setActionDueDate = useCallback(async (goalId, milestoneId, actionId, dueDate) => {
    setGoals((gs) => gs.map((g) => g.id !== goalId ? g : {
      ...g,
      milestones: g.milestones.map((m) => m.id !== milestoneId ? m : {
        ...m,
        actions: m.actions.map((a) => (a.id === actionId ? { ...a, dueDate: dueDate || null } : a)),
      }),
    }));
    const { error } = await supabase.from("goal_actions").update({ due_date: dueDate || null }).eq("id", actionId);
    if (error) fail("setActionDueDate", error);
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
    const { error } = await supabase.from("goal_actions").update({ title: title.trim() }).eq("id", actionId);
    if (error) fail("renameAction", error);
  }, []);

  // See useTasks' renameCategoryEverywhere — carries every goal already tagged with the
  // old category name over to the new one.
  const renameCategoryEverywhere = useCallback(async (oldKey, newKey) => {
    setGoals((gs) => gs.map((g) => (g.category === oldKey ? { ...g, category: newKey } : g)));
    const { error } = await supabase.from("goals").update({ category: newKey }).eq("user_id", userId).eq("category", oldKey);
    if (error) fail("renameCategoryEverywhere", error);
  }, [userId]);

  return { goals, loading, addGoal, removeGoal, renameGoal, setGoalDeadline, addMilestone, removeMilestone, renameMilestone, setMilestoneDueDate, addAction, moveAction, setActionDone, removeAction, renameAction, setActionDueDate, renameCategoryEverywhere };
}
