import { addDays, toISO } from "./dateHelpers";

const parseISO = (iso) => new Date(`${iso}T00:00:00`);

// Same load accounting as distributeDatesByLoad/sessionMinutesByLoad (dateHelpers.js) —
// minutes, counting undone tasks and all events, falling back to the same default-length
// assumptions for anything with no estimate of its own. Only looks at today onward —
// anything in the past is planOverdueSessionReflow's job (overdueSessions.js), not this one.
function loadByDate(tasks, events, todayISO) {
  const load = {};
  (tasks || []).forEach((t) => {
    if (!t.date || t.done || t.date < todayISO) return;
    load[t.date] = (load[t.date] || 0) + (t.duration ?? 30);
  });
  (events || []).forEach((e) => {
    if (!e.date || e.date < todayISO) return;
    load[e.date] = (load[e.date] || 0) + (e.duration ?? 60);
  });
  return load;
}

// Pure planning pass, no side effects or Supabase calls — given everything currently
// scheduled and a per-day capacity (minutes, from the student's own usable-window
// setting), finds any day over capacity and, if a flexible breakdown session (part of a
// "break it down" group or an Education work session — never a fixed-time task or a
// one-off with its own real due date) sits on it, works out whether moving ONE such
// session to a lighter day — still within its own allowed window, today through the day
// before its real deadline — would actually help. Only plans the move if a genuinely
// lighter day exists there; otherwise leaves it put rather than forcing a shuffle that
// doesn't help anyone. Plans at most one move per overloaded day per call — call again
// after applying (the reactive effect in App.jsx does, since it re-runs whenever tasks
// change) to keep resolving a day that's still over after one move.
export function planOverloadRebalance(tasks, events, eduItems, capacityMinutes, todayISO) {
  if (!capacityMinutes || capacityMinutes <= 0) return [];
  const load = loadByDate(tasks, events, todayISO);
  const eduDueById = new Map((eduItems || []).map((e) => [e.id, e.dueDate]));
  const ops = [];

  for (const date of Object.keys(load).sort()) {
    if (load[date] <= capacityMinutes) continue;

    const movable = (tasks || []).filter((t) => t.date === date && !t.done && t.start == null && (t.groupId || t.eduId));
    if (movable.length === 0) continue;

    // Move the biggest one first — one well-chosen move is more likely to actually bring
    // the day back under capacity than several small ones.
    movable.sort((a, b) => (b.duration ?? 30) - (a.duration ?? 30));
    const session = movable[0];
    const deadline = session.groupDueDate || (session.eduId ? eduDueById.get(session.eduId) : null);
    const lastWorkDay = deadline ? toISO(addDays(parseISO(deadline), -1)) : toISO(addDays(parseISO(todayISO), 14));
    if (lastWorkDay < todayISO) continue; // the deadline's basically now — nowhere left to move it to

    // Other sessions for this same breakdown/assignment already occupy their own days —
    // never land two sessions for the same thing on the same day.
    const occupied = new Set(
      (tasks || [])
        .filter((t) => t.id !== session.id && !t.done && ((session.groupId && t.groupId === session.groupId) || (session.eduId && t.eduId === session.eduId)))
        .map((t) => t.date)
    );

    let cursor = todayISO;
    let bestDate = null;
    let bestLoad = Infinity;
    while (cursor <= lastWorkDay) {
      if (cursor !== date && !occupied.has(cursor)) {
        const l = load[cursor] || 0;
        if (l < bestLoad) { bestLoad = l; bestDate = cursor; }
      }
      cursor = toISO(addDays(parseISO(cursor), 1));
    }

    const sessionMinutes = session.duration ?? 30;
    // Only move if the target day would genuinely still have room — moving the overload
    // onto an equally- or more-loaded day wouldn't fix anything, just relocate it.
    if (bestDate && bestLoad + sessionMinutes <= capacityMinutes) {
      ops.push({ taskId: session.id, fromDate: date, toDate: bestDate });
      load[date] -= sessionMinutes;
      load[bestDate] = (load[bestDate] || 0) + sessionMinutes;
    }
  }

  return ops;
}

// Applies a plan from planOverloadRebalance in order.
export async function applyOverloadRebalance(ops, setTaskDate) {
  for (const op of ops) await setTaskDate(op.taskId, op.toDate);
}
