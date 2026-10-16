import { addDays, dayBefore, getLocalToday, toISO } from "./dateHelpers";

const parseISO = (iso) => new Date(`${iso}T00:00:00`);
const nextDayISO = (iso) => toISO(addDays(parseISO(iso), 1));

// Joins an absorbed session's notes onto the target session's — the absorbed piece
// always comes FIRST, the target's own notes last. The session being absorbed is always
// the more-overdue one (planOverdueSessionReflow only ever absorbs into a day that's
// today or later), so it's the one that was actually due first; showing it after the
// target's own same-day content would read as "do today's own thing, then go back and
// do the older thing," backwards from the order they're actually meant to happen in.
// Skips re-appending content that's already present, so re-planning after a page
// refresh mid-run (see applyOverdueSessionOps) can't double it.
export const mergeAbsorbedNotes = (existingNotes, absorbedNotes) => {
  const existing = (existingNotes || "").trim();
  const absorbed = (absorbedNotes || "").trim();
  if (!absorbed) return existingNotes || null;
  if (!existing) return absorbed;
  if (existing.includes(absorbed)) return existingNotes;
  return `${absorbed}, ${existing}`;
};

// Pure planning pass — no Supabase calls, no side effects. Given every task and
// edu_item, works out what has to move or merge to clear every overdue, not-done
// Education work session (a `tasks` row with `eduId` set) without ever putting two
// sessions for the same edu_id on the same day. Returns a flat, already-ordered list of
// operations; apply them in order with applyOverdueSessionOps.
//
// Re-running this against whatever actually landed in the database (rather than
// blindly re-running a cached plan) is what makes an interrupted run self-correcting:
// a chain shift is planned last-link-first specifically so that at every point in an
// in-order apply, the day a session is moving to has already been vacated — so even a
// refresh mid-chain leaves a state with no date collisions, and replanning from there
// picks up exactly where it left off (see the shift branch below for how). An absorb
// is a plain update-then-delete; mergeAbsorbedNotes' "already there" check keeps a
// re-run from double-absorbing if a refresh lands between those two writes.
export function planOverdueSessionReflow(tasks, eduItems, todayISO = getLocalToday()) {
  const ops = [];
  const sessionsByEdu = new Map();
  for (const t of tasks) {
    if (!t.eduId) continue;
    if (!sessionsByEdu.has(t.eduId)) sessionsByEdu.set(t.eduId, []);
    sessionsByEdu.get(t.eduId).push({ id: t.id, date: t.date, done: t.done, notes: t.notes });
  }

  for (const item of eduItems) {
    const working = sessionsByEdu.get(item.id);
    if (!working || working.length === 0) continue;
    const dueISO = item.dueDate || toISO(addDays(parseISO(todayISO), 7));
    const duePassed = dueISO <= todayISO;
    // Work never lands on the due date itself, same convention every scheduler in this
    // app already follows — so the shift window's last usable day is the day before.
    const maxWorkDay = duePassed ? todayISO : dayBefore(dueISO);

    // Resolve the oldest remaining overdue session for this task, one at a time, until
    // none are left — this is what makes two overdue sessions for the same task
    // process oldest-first: each pass re-reads `working` (already mutated by the
    // previous pass), so the loop naturally advances to the next-oldest.
    let guard = 0;
    while (guard++ < 200) {
      const overdue = working.filter((s) => !s.done && s.date < todayISO).sort((a, b) => a.date.localeCompare(b.date));
      if (overdue.length === 0) break;
      const target = overdue[0];

      if (duePassed) {
        const todaySession = working.find((s) => s.id !== target.id && s.date === todayISO);
        if (!todaySession) {
          ops.push({ type: "move", taskId: target.id, toDate: todayISO });
          target.date = todayISO;
        } else {
          ops.push({ type: "absorb", overdueTaskId: target.id, targetTaskId: todaySession.id, absorbedNotes: target.notes });
          todaySession.notes = mergeAbsorbedNotes(todaySession.notes, target.notes);
          working.splice(working.indexOf(target), 1);
        }
        continue;
      }

      // Which of today..maxWorkDay already have a session for this task, split into
      // "done" (fixed in place, can't be displaced or landed on — the walk below steps
      // over these without touching them) and "not done" (can be pushed forward).
      const occupied = new Map();
      const doneDays = new Set();
      for (const s of working) {
        if (s.id === target.id || s.date < todayISO || s.date > maxWorkDay) continue;
        if (s.done) doneDays.add(s.date);
        else occupied.set(s.date, s);
      }

      let day = todayISO;
      let carrying = target;
      const chain = [];
      let foundFreeDay = false;
      while (day <= maxWorkDay) {
        if (doneDays.has(day)) {
          day = nextDayISO(day);
          continue;
        }
        if (!occupied.has(day)) {
          chain.push({ session: carrying, toDate: day });
          foundFreeDay = true;
          break;
        }
        chain.push({ session: carrying, toDate: day });
        carrying = occupied.get(day);
        day = nextDayISO(day);
      }

      if (foundFreeDay) {
        for (let i = chain.length - 1; i >= 0; i--) {
          const { session, toDate } = chain[i];
          ops.push({ type: "move", taskId: session.id, toDate });
          session.date = toDate;
        }
      } else {
        // Every day in the window is already taken, so today has to be one of them —
        // absorb into it rather than shift (there's nowhere left to shift to).
        const todaySession = working.find((s) => s.id !== target.id && s.date === todayISO);
        if (todaySession) {
          ops.push({ type: "absorb", overdueTaskId: target.id, targetTaskId: todaySession.id, absorbedNotes: target.notes });
          todaySession.notes = mergeAbsorbedNotes(todaySession.notes, target.notes);
          working.splice(working.indexOf(target), 1);
        } else {
          // Defensive fallback only — todaySession missing here would mean today was
          // free, which the walk above would already have caught.
          ops.push({ type: "move", taskId: target.id, toDate: todayISO });
          target.date = todayISO;
        }
      }
    }
  }

  return ops;
}

// Plans what happens when the student explicitly pushes ONE task forward by a day (the
// Dashboard "push to tomorrow" button) — for something she already knows she's not
// getting to tonight. Same combine behavior the automatic reflow above already uses: if
// the day this lands on already holds another not-done session for the exact same
// assignment/breakdown (matching eduId or groupId), that's the same piece of work twice
// over, so this absorbs into the one already there instead of creating a second row for
// it. If there's nothing to absorb into, it only actually lands on a day that still has
// real room left (the same usable-window capacity math the automatic overload rebalance
// already uses) — a day with no session on it yet isn't necessarily a free day, it might
// just already be packed with other work, which is exactly the case that should keep
// this walking forward one more day rather than dropping onto an already-overloaded day.
// Never pushes a breakdown step/work session onto or past its own real deadline (same
// "never on the due date itself" rule every scheduler here follows); a plain task has no
// separate deadline of its own (its date IS the due date), so it only gets a generous
// safety bound instead.
export function planPushTaskToNextDay(tasks, events, eduItems, taskId, capacityMinutes) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.date) return [];

  const sameAssignment = (other) =>
    other.id !== task.id && !other.done &&
    ((task.eduId && other.eduId === task.eduId) || (task.groupId && other.groupId === task.groupId));

  const deadline = task.groupDueDate || (task.eduId ? eduItems.find((e) => e.id === task.eduId)?.dueDate : null);
  const lastDay = deadline ? dayBefore(deadline) : toISO(addDays(parseISO(task.date), 60));

  const loadOf = (date) => {
    let load = 0;
    tasks.forEach((t) => { if (t.id !== task.id && t.date === date && !t.done) load += t.duration ?? 30; });
    (events || []).forEach((e) => { if (e.date === date) load += e.duration ?? 60; });
    return load;
  };

  let day = nextDayISO(task.date);
  let guard = 0;
  while (guard++ < 60) {
    if (day > lastDay) { day = lastDay; break; }
    const existing = tasks.find((t) => t.date === day && sameAssignment(t));
    if (existing) return [{ type: "absorb", overdueTaskId: task.id, targetTaskId: existing.id, absorbedNotes: task.notes }];
    if (!capacityMinutes || loadOf(day) + (task.duration ?? 30) <= capacityMinutes) {
      return [{ type: "move", taskId: task.id, toDate: day }];
    }
    day = nextDayISO(day);
  }
  // Ran every day through the deadline (or the safety bound) without finding room —
  // still worth one last check for something to combine with there before just landing
  // on it anyway; better than refusing to move it at all.
  const existing = tasks.find((t) => t.date === day && sameAssignment(t));
  if (existing) return [{ type: "absorb", overdueTaskId: task.id, targetTaskId: existing.id, absorbedNotes: task.notes }];
  return [{ type: "move", taskId: task.id, toDate: day }];
}

// Applies a plan from planOverdueSessionReflow in order. Keeps its own running notes
// per task id (rather than re-reading the `tasks` array, which stays fixed for the
// duration of this call) so two absorbs into the same session within one pass merge
// onto each other correctly instead of each overwriting the other's write.
export async function applyOverdueSessionOps(ops, tasks, { setTaskDate, setTaskNotes, removeTask }) {
  const notesById = new Map(tasks.map((t) => [t.id, t.notes]));
  for (const op of ops) {
    if (op.type === "move") {
      await setTaskDate(op.taskId, op.toDate);
    } else {
      const current = notesById.get(op.targetTaskId);
      const merged = mergeAbsorbedNotes(current, op.absorbedNotes);
      if (merged !== current) {
        await setTaskNotes(op.targetTaskId, merged);
        notesById.set(op.targetTaskId, merged);
      }
      await removeTask(op.overdueTaskId);
    }
  }
}
