// Tests for planOverloadRebalance — in particular, that it never relocates a session
// sitting on the one day it's guaranteed to be on: the day right before its own
// deadline (an Assessment's mandatory night-before cram session, a Homework's always-
// kept last-day reminder, a group's last work day). A crowded calendar is exactly the
// condition this function exists to resolve, so that's precisely when the guarantee
// most needs to hold.
import { describe, it, expect } from "vitest";
import { planOverloadRebalance } from "./overloadRebalance";

describe("planOverloadRebalance — never moves the mandatory day-before-deadline session", () => {
  it("leaves the night-before session in place even when its day is over capacity, moving something else instead", () => {
    const tasks = [
      // The night-before session for an assessment due 2026-09-16 — sits on an
      // overloaded day (2026-09-15), but must never be the one that moves.
      { id: "night-before", date: "2026-09-15", duration: 90, done: false, start: null, eduId: "e1" },
      // A plain homework session for a DIFFERENT, later-due assignment, also on the
      // same overloaded day — this one is free to move.
      { id: "other", date: "2026-09-15", duration: 60, done: false, start: null, eduId: "e2" },
    ];
    const eduItems = [
      { id: "e1", dueDate: "2026-09-16" },
      { id: "e2", dueDate: "2026-09-20" },
    ];
    // Capacity of 100 minutes: 90 + 60 = 150 on 09-15 is over it.
    const ops = planOverloadRebalance(tasks, [], eduItems, 100, "2026-09-10");
    expect(ops.some((op) => op.taskId === "night-before")).toBe(false);
    expect(ops.some((op) => op.taskId === "other")).toBe(true);
  });

  it("does nothing at all when the only movable session on an overloaded day is the night-before one", () => {
    const tasks = [{ id: "night-before", date: "2026-09-15", duration: 90, done: false, start: null, eduId: "e1" }];
    const eduItems = [{ id: "e1", dueDate: "2026-09-16" }];
    const ops = planOverloadRebalance(tasks, [], eduItems, 10, "2026-09-10");
    expect(ops).toEqual([]);
  });

  it("still moves an ordinary group session that happens to be overloaded (unchanged pre-existing behavior)", () => {
    const tasks = [
      { id: "a", date: "2026-09-15", duration: 90, done: false, start: null, groupId: "g1", groupDueDate: "2026-09-25" },
      { id: "busy", date: "2026-09-15", duration: 500, done: false, start: null }, // unrelated, just fills the day
    ];
    const ops = planOverloadRebalance(tasks, [], [], 400, "2026-09-10");
    expect(ops.length).toBe(1);
    expect(ops[0].taskId).toBe("a");
    expect(ops[0].toDate).not.toBe("2026-09-15");
  });
});
