// Tests for the shared "what's on my plate" ordering every page sorts by (see the
// file-level comment in taskPriority.js for the rule itself) — homework, then assignment
// work, then studying, unless something's actually due today/tomorrow, which jumps the
// queue regardless of kind; a manual drag from earlier today wins over all of it.
import { describe, it, expect } from "vitest";
import { compareTaskPriority, isUrgentSoon, taskKindRank } from "./taskPriority";

const TODAY = "2026-10-16";

describe("taskKindRank", () => {
  it("ranks a Homework edu type first", () => {
    expect(taskKindRank({ eduType: "Homework" })).toBe(0);
  });
  it("ranks an Assessment edu type (studying) last of the three", () => {
    expect(taskKindRank({ eduType: "Assessment" })).toBe(2);
  });
  it("ranks an Assignment edu type, or any groupId, as 'working on an assignment'", () => {
    expect(taskKindRank({ eduType: "Assignment" })).toBe(1);
    expect(taskKindRank({ groupId: "g1" })).toBe(1);
  });
  it("falls back to the title prefix addEduItem gives each work session", () => {
    expect(taskKindRank({ title: "Finish: Lab report" })).toBe(0);
    expect(taskKindRank({ title: "Work on: Essay" })).toBe(1);
    expect(taskKindRank({ title: "Study: Chem test" })).toBe(2);
  });
  it("a plain task with none of those signals sorts after all three", () => {
    expect(taskKindRank({ title: "Buy poster board" })).toBe(3);
  });
});

describe("isUrgentSoon", () => {
  it("true for overdue, due today, and due tomorrow", () => {
    expect(isUrgentSoon("2026-10-14", TODAY)).toBe(true);
    expect(isUrgentSoon(TODAY, TODAY)).toBe(true);
    expect(isUrgentSoon("2026-10-17", TODAY)).toBe(true);
  });
  it("false for anything past tomorrow, or no date at all", () => {
    expect(isUrgentSoon("2026-10-18", TODAY)).toBe(false);
    expect(isUrgentSoon(null, TODAY)).toBe(false);
  });
});

describe("compareTaskPriority", () => {
  it("defaults to homework, then assignment work, then studying, when nothing is urgent", () => {
    const items = [
      { id: "study", title: "Study: Chem test", date: "2026-10-25" },
      { id: "hw", title: "Finish: Worksheet", date: "2026-10-25" },
      { id: "work", title: "Work on: Essay", date: "2026-10-25" },
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["hw", "work", "study"]);
  });

  it("a test due tomorrow jumps ahead of homework due further out", () => {
    const items = [
      { id: "hw", title: "Finish: Worksheet", date: "2026-10-25" },
      { id: "test", title: "Study: Chem test", date: "2026-10-17" }, // tomorrow
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["test", "hw"]);
  });

  it("an assignment due tomorrow jumps ahead too, same as a test", () => {
    const items = [
      { id: "study", title: "Study: Bio test", date: "2026-11-01" },
      { id: "assignment", title: "Work on: Essay", date: TODAY, sortDate: "2026-10-17" }, // due tomorrow
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["assignment", "study"]);
  });

  it("something not due for weeks doesn't out-urgent something due today even if homework", () => {
    const items = [
      { id: "farHw", title: "Finish: Worksheet", date: "2026-11-01" },
      { id: "todayStudy", title: "Study: Bio test", date: TODAY },
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["todayStudy", "farHw"]);
  });

  it("a manual drag from earlier today wins outright over kind and urgency", () => {
    const items = [
      { id: "urgent", title: "Study: Bio test", date: TODAY },
      { id: "dragged", title: "Buy poster board", date: "2026-11-01", orderIndex: 0, orderSetDate: TODAY },
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["dragged", "urgent"]);
  });

  it("a stale drag from a previous day falls back to normal priority instead of staying pinned", () => {
    const items = [
      { id: "hw", title: "Finish: Worksheet", date: "2026-10-25" },
      { id: "staleDrag", title: "Study: Bio test", date: "2026-10-25", orderIndex: 0, orderSetDate: "2026-10-01" },
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["hw", "staleDrag"]);
  });

  it("same kind and date falls back to duration, the quicker thing first", () => {
    const items = [
      { id: "long", title: "Work on: Essay", date: "2026-10-25", duration: 90 },
      { id: "short", title: "Work on: Slides", date: "2026-10-25", duration: 30 },
    ];
    const sorted = items.slice().sort((a, b) => compareTaskPriority(a, b, TODAY));
    expect(sorted.map((it) => it.id)).toEqual(["short", "long"]);
  });
});
