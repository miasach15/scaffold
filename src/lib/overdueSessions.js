import { addDays, dayBefore, getLocalToday, toISO } from "./dateHelpers";

const parseISO = (iso) => new Date(`${iso}T00:00:00`);
const nextDayISO = (iso) => toISO(addDays(parseISO(iso), 1));

// Joins an absorbed session's notes onto the target session's, same "what's already
// there, then the new part after a comma" convention groupItemsByDate already uses for
// same-day step collisions. Skips re-appending content that's already present, so
// re-planning after a page refresh mid-run (see applyOverdueSessionOps) can't double it.
export const mergeAbsorbedNotes = (existingNotes, absorbedNotes) => {
  const existing = (existingNotes || "").trim();
  const absorbed = (absorbedNotes || "").trim();
  if (!absorbed) return existingNotes || null;
  if (!existing) return absorbed;
  if (existing.includes(absorbed)) return existingNotes;
  return `${existing}, ${absorbed}`;
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
