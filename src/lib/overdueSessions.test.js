// Tests for the automatic overdue-session reflow (see the file-level comment in
// overdueSessions.js for the rule itself). Pure-function tests against
// planOverdueSessionReflow — no Supabase, no React, no component rendering — since the
// entire decision ("shift or absorb, in what order") lives in that one function. Dates
// are plain YYYY-MM-DD strings throughout, same convention as the rest of the app.
import { describe, it, expect, afterEach, vi } from "vitest";
import { getLocalToday } from "./dateHelpers";
import { applyOverdueSessionOps, mergeAbsorbedNotes, planOverdueSessionReflow } from "./overdueSessions";

// A minimal session-task factory — only the fields planOverdueSessionReflow reads.
const session = (id, date, { done = false, notes = null, eduId = "e1" } = {}) => ({ id, eduId, date, done, notes });
const opsFor = (ops, taskId) => ops.filter((o) => (o.type === "move" ? o.taskId : o.overdueTaskId) === taskId);

describe("planOverdueSessionReflow — SHIFT (a free day exists in the window)", () => {
  it("Mon(overdue), Tue(today), Wed, due Fri: shifts Mon→Tue, Tue→Wed, Wed→Thu, stops at the free day", () => {
    const tasks = [
      session("mon", "2026-09-14"),
      session("tue", "2026-09-15"),
      session("wed", "2026-09-16"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-18" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");

    expect(ops.every((o) => o.type === "move")).toBe(true);
    // Applied in order, so the sequence itself must never put two of this task's
    // sessions on the same day at any point — reconstruct the running date map and
    // assert that invariant across every step, not just the end state.
    const dateOf = { mon: "2026-09-14", tue: "2026-09-15", wed: "2026-09-16" };
    for (const op of ops) {
      dateOf[op.taskId] = op.toDate;
      const seen = new Set();
      for (const d of Object.values(dateOf)) {
        expect(seen.has(d)).toBe(false);
        seen.add(d);
      }
    }
    expect(dateOf).toEqual({ mon: "2026-09-15", tue: "2026-09-16", wed: "2026-09-17" });
  });

  it("stops at the first free day and never touches sessions past it", () => {
    // Same as above but with an extra, already-in-the-future session on Fri (still
    // before the due date of Mon the following week) that must not move.
    const tasks = [
      session("mon", "2026-09-14"),
      session("tue", "2026-09-15"),
      session("wed", "2026-09-16"),
      session("fri", "2026-09-18"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-25" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");
    expect(opsFor(ops, "fri").length).toBe(0);
  });
});

describe("planOverdueSessionReflow — ABSORB (no free day in the window)", () => {
  it("Mon(overdue), Tue(today), Wed, Thu, due Thu: Mon's notes absorb into Tue, Mon deleted", () => {
    const tasks = [
      session("mon", "2026-09-14", { notes: "finish outline" }),
      session("tue", "2026-09-15", { notes: "read chapter 3" }),
      session("wed", "2026-09-16"),
      session("thu", "2026-09-17"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-17" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");

    expect(ops).toEqual([
      { type: "absorb", overdueTaskId: "mon", targetTaskId: "tue", absorbedNotes: "finish outline" },
    ]);
  });
});

describe("planOverdueSessionReflow — oldest overdue first, one task at a time", () => {
  it("two overdue sessions (Sun, Mon), today Tue, due Fri: Sun resolves before Mon, one session per day, no duplicates", () => {
    const tasks = [session("sun", "2026-09-13"), session("mon", "2026-09-14")];
    const eduItems = [{ id: "e1", dueDate: "2026-09-18" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");

    // Sun's op(s) must all come before Mon's first op — oldest overdue processed first.
    const firstMonIdx = ops.findIndex((o) => (o.taskId || o.overdueTaskId) === "mon");
    const lastSunIdx = ops.map((o) => (o.taskId || o.overdueTaskId) === "sun").lastIndexOf(true);
    expect(lastSunIdx).toBeLessThan(firstMonIdx);

    const dateOf = { sun: "2026-09-13", mon: "2026-09-14" };
    for (const op of ops) if (op.type === "move") dateOf[op.taskId] = op.toDate;
    const dates = Object.values(dateOf);
    expect(new Set(dates).size).toBe(dates.length); // no duplicates
    expect(dates.every((d) => d >= "2026-09-15")).toBe(true); // nothing still overdue
  });
});

describe("planOverdueSessionReflow — completed sessions never move", () => {
  it("a done session in the chain is skipped over, not displaced", () => {
    const tasks = [
      session("mon", "2026-09-14"), // overdue, not done
      session("tue-done", "2026-09-15", { done: true }), // today, but completed — fixed in place
      session("wed", "2026-09-16"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-18" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");

    expect(opsFor(ops, "tue-done").length).toBe(0); // never appears in any op
    const dateOf = { mon: "2026-09-14", wed: "2026-09-16" };
    for (const op of ops) if (op.type === "move") dateOf[op.taskId] = op.toDate;
    expect(dateOf.mon).toBe("2026-09-16"); // skipped over the done day at Tue
    expect(dateOf.wed).toBe("2026-09-17");
  });
});

describe("planOverdueSessionReflow — due date already past", () => {
  it("absorbs into today's session when one exists", () => {
    const tasks = [session("old", "2026-09-08", { notes: "step one" }), session("today-sess", "2026-09-15", { notes: "step two" })];
    const eduItems = [{ id: "e1", dueDate: "2026-09-10" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");
    expect(ops).toEqual([{ type: "absorb", overdueTaskId: "old", targetTaskId: "today-sess", absorbedNotes: "step one" }]);
  });

  it("moves the overdue session to today when nothing else is scheduled for today", () => {
    const tasks = [session("old", "2026-09-08")];
    const eduItems = [{ id: "e1", dueDate: "2026-09-10" }];
    const ops = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");
    expect(ops).toEqual([{ type: "move", taskId: "old", toDate: "2026-09-15" }]);
  });
});

describe("planOverdueSessionReflow — idempotent", () => {
  it("running it twice in a row produces no ops the second time", () => {
    const tasks = [
      session("mon", "2026-09-14"),
      session("tue", "2026-09-15"),
      session("wed", "2026-09-16"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-18" }];
    const firstRun = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");

    // Apply firstRun's moves to a copy of tasks to get the post-run state.
    const applied = tasks.map((t) => ({ ...t }));
    for (const op of firstRun) {
      if (op.type === "move") applied.find((t) => t.id === op.taskId).date = op.toDate;
    }
    const secondRun = planOverdueSessionReflow(applied, eduItems, "2026-09-15");
    expect(secondRun).toEqual([]);
  });

  it("running it twice after an ABSORB also produces no ops the second time", () => {
    const tasks = [
      session("mon", "2026-09-14", { notes: "a" }),
      session("tue", "2026-09-15", { notes: "b" }),
      session("wed", "2026-09-16"),
      session("thu", "2026-09-17"),
    ];
    const eduItems = [{ id: "e1", dueDate: "2026-09-17" }];
    const firstRun = planOverdueSessionReflow(tasks, eduItems, "2026-09-15");
    expect(firstRun[0].type).toBe("absorb");

    // Apply the absorb: merge notes into the target, drop the overdue row.
    let applied = tasks.map((t) => ({ ...t }));
    const op = firstRun[0];
    const target = applied.find((t) => t.id === op.targetTaskId);
    target.notes = mergeAbsorbedNotes(target.notes, op.absorbedNotes);
    applied = applied.filter((t) => t.id !== op.overdueTaskId);

    const secondRun = planOverdueSessionReflow(applied, eduItems, "2026-09-15");
    expect(secondRun).toEqual([]);
  });
});

describe("applyOverdueSessionOps — the actual apply path App.jsx's effect calls", () => {
  it("chains two absorbs into the same target correctly instead of each overwriting the other's write", () => {
    // The scenario a stale re-fetch of `tasks` mid-run would get wrong: two overdue
    // sessions for two different tasks both absorb into the SAME target task within
    // one apply pass. The second absorb must build on the first's merged notes, not
    // the target's original (pre-run) notes.
    const tasks = [
      { id: "target", notes: "base" },
      { id: "a", notes: null },
      { id: "b", notes: null },
    ];
    const ops = [
      { type: "absorb", overdueTaskId: "a", targetTaskId: "target", absorbedNotes: "from a" },
      { type: "absorb", overdueTaskId: "b", targetTaskId: "target", absorbedNotes: "from b" },
    ];
    const notesWrites = [];
    const removed = [];
    const setTaskNotes = async (id, notes) => notesWrites.push([id, notes]);
    const removeTask = async (id) => removed.push(id);
    return applyOverdueSessionOps(ops, tasks, { setTaskDate: async () => {}, setTaskNotes, removeTask }).then(() => {
      expect(notesWrites).toEqual([
        ["target", "base, from a"],
        ["target", "base, from a, from b"],
      ]);
      expect(removed).toEqual(["a", "b"]);
    });
  });

  it("issues a plain date update for a move op", async () => {
    const dateWrites = [];
    const setTaskDate = async (id, date) => dateWrites.push([id, date]);
    await applyOverdueSessionOps([{ type: "move", taskId: "x", toDate: "2026-09-20" }], [{ id: "x", notes: null }], {
      setTaskDate,
      setTaskNotes: async () => {},
      removeTask: async () => {},
    });
    expect(dateWrites).toEqual([["x", "2026-09-20"]]);
  });
});

describe("mergeAbsorbedNotes", () => {
  it("appends after a comma when both sides have content", () => {
    expect(mergeAbsorbedNotes("read chapter 3", "finish outline")).toBe("read chapter 3, finish outline");
  });
  it("returns the absorbed content alone when the target has none", () => {
    expect(mergeAbsorbedNotes(null, "finish outline")).toBe("finish outline");
  });
  it("returns the target unchanged when there's nothing to absorb", () => {
    expect(mergeAbsorbedNotes("read chapter 3", null)).toBe("read chapter 3");
  });
  it("doesn't duplicate content that's already been absorbed (safe to re-run mid-absorb)", () => {
    expect(mergeAbsorbedNotes("read chapter 3, finish outline", "finish outline")).toBe("read chapter 3, finish outline");
  });
});

describe("planOverdueSessionReflow — midnight boundary, UTC vs America/New_York", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const runAt = (isoInstant, tz) => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(isoInstant));
    const today = getLocalToday();
    const tasks = [session("mon", "2026-09-14"), session("tue", "2026-09-15"), session("wed", "2026-09-16")];
    const eduItems = [{ id: "e1", dueDate: "2026-09-18" }];
    return { today, ops: planOverdueSessionReflow(tasks, eduItems, today) };
  };

  it("produces identical plans for the same wall-clock moment in both timezones", () => {
    // 2026-09-15 00:30 local, expressed as the matching UTC instant for each zone.
    const utc = runAt("2026-09-15T00:30:00Z", "UTC");
    const ny = runAt("2026-09-15T00:30:00-04:00", "America/New_York");
    expect(utc.today).toBe("2026-09-15");
    expect(ny.today).toBe("2026-09-15");
    expect(utc.ops).toEqual(ny.ops);
  });
});
