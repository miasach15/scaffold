// Tests for the Tasks overdue/move-a-task logic: isOverdueTask, sortOverdueOldestFirst,
// chipBelongsOnDay, getLocalToday, getLocalTomorrow. Deliberately pure-function tests —
// no DOM/component rendering needed, since all the actual decisions ("is this overdue",
// "what order do they show in", "does this chip belong on this Calendar day") live in
// these plain functions rather than inline in JSX. That's also what makes the timezone
// tests below meaningful: we can mock the system clock to a specific instant/timezone
// and call the exact same functions the app calls, with no risk of a component's own
// rendering quirks masking a real date-logic bug.
import { describe, it, expect, afterEach, vi } from "vitest";
import { getLocalToday, getLocalTomorrow, isOverdueTask, sortOverdueOldestFirst, chipBelongsOnDay, groupItemsByDate } from "./dateHelpers";

describe("isOverdueTask", () => {
  it("a task due yesterday is overdue", () => {
    expect(isOverdueTask({ date: "2026-09-16", done: false }, "2026-09-17")).toBe(true);
  });

  it("a task due today is NOT overdue", () => {
    expect(isOverdueTask({ date: "2026-09-17", done: false }, "2026-09-17")).toBe(false);
  });

  it("a task due in the future is NOT overdue", () => {
    expect(isOverdueTask({ date: "2026-09-18", done: false }, "2026-09-17")).toBe(false);
  });

  it("a done task is NOT overdue no matter how old its due date is", () => {
    expect(isOverdueTask({ date: "2020-01-01", done: true }, "2026-09-17")).toBe(false);
  });

  it("a task with no due date is NOT overdue", () => {
    expect(isOverdueTask({ date: null, done: false }, "2026-09-17")).toBe(false);
  });
});

describe("midnight local-time boundary", () => {
  // Same wall-clock moment (just after midnight, Jan 2) looked at through two different
  // timezones. UTC and America/New_York disagree about what instant "midnight America/
  // New_York" is in absolute terms, so if any date logic secretly used
  // new Date().toISOString() (UTC) instead of local getters, these two runs would
  // disagree about whether Jan 1's task is overdue. They must not.
  afterEach(() => {
    vi.useRealTimers();
  });

  const runAt = (isoInstant, tz) => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(isoInstant));
    const today = getLocalToday();
    const tomorrow = getLocalTomorrow();
    const overdueYesterday = isOverdueTask({ date: "2026-01-01", done: false }, today);
    const overdueToday = isOverdueTask({ date: today, done: false }, today);
    return { today, tomorrow, overdueYesterday, overdueToday };
  };

  it("gives the same grouping decision in UTC and America/New_York for the same wall-clock moment", () => {
    // 2026-01-02 00:30 local time, expressed as the matching UTC instant for each zone.
    const utc = runAt("2026-01-02T00:30:00Z", "UTC");
    const ny = runAt("2026-01-02T00:30:00-05:00", "America/New_York");

    expect(utc.today).toBe("2026-01-02");
    expect(ny.today).toBe("2026-01-02");
    expect(utc.tomorrow).toBe("2026-01-03");
    expect(ny.tomorrow).toBe("2026-01-03");
    // The Jan 1 task is "yesterday" and overdue in both — the whole point of the test.
    expect(utc.overdueYesterday).toBe(true);
    expect(ny.overdueYesterday).toBe(true);
    expect(utc.overdueToday).toBe(false);
    expect(ny.overdueToday).toBe(false);
  });

  it("a task due today becomes 'From earlier' right after local midnight, not UTC midnight", () => {
    // 11:59pm Jan 1 America/New_York — still today, not overdue yet.
    process.env.TZ = "America/New_York";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T04:59:00Z")); // 23:59 Jan 1 in America/New_York (UTC-5)
    const todayBefore = getLocalToday();
    expect(isOverdueTask({ date: todayBefore, done: false }, todayBefore)).toBe(false);

    // One minute later, past local midnight — same task's date is now yesterday relative
    // to the new local "today", so it's overdue. This is the actual midnight-boundary
    // behavior the app relies on; it would break if any of this used UTC's midnight
    // instead (UTC midnight already passed hours earlier for America/New_York).
    vi.setSystemTime(new Date("2026-01-02T05:01:00Z")); // 00:01 Jan 2 in America/New_York
    const todayAfter = getLocalToday();
    expect(todayAfter).not.toBe(todayBefore);
    expect(isOverdueTask({ date: todayBefore, done: false }, todayAfter)).toBe(true);
    vi.useRealTimers();
  });
});

describe("sortOverdueOldestFirst", () => {
  const today = "2026-09-17";
  const make = (id, date, done = false) => ({ id, date, done, title: id });

  it("sorts overdue tasks oldest due date first", () => {
    const tasks = [make("c", "2026-09-15"), make("a", "2026-09-10"), make("b", "2026-09-14")];
    const result = sortOverdueOldestFirst(tasks, today).map((t) => t.id);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("excludes done and not-yet-due tasks", () => {
    const tasks = [make("overdue", "2026-09-10"), make("done", "2026-09-10", true), make("future", "2026-09-20"), make("today", today)];
    const result = sortOverdueOldestFirst(tasks, today).map((t) => t.id);
    expect(result).toEqual(["overdue"]);
  });

  it("5 overdue tasks: the caller shows 3 plus a '+2 more' — this just proves the full sorted list has all 5, in order, for the caller to slice", () => {
    const tasks = [1, 2, 3, 4, 5].map((n) => make(`t${n}`, `2026-09-${10 + n}`));
    const sorted = sortOverdueOldestFirst(tasks, today);
    expect(sorted).toHaveLength(5);
    const visible = sorted.slice(0, 3);
    const hiddenCount = sorted.length - visible.length;
    expect(visible.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(hiddenCount).toBe(2);
  });

  it("completing an overdue task stores nothing about lateness — done just flips true, date is untouched", () => {
    const task = make("t1", "2026-09-10");
    // This mirrors exactly what setTaskDone in useTasks.js does: { ...t, done }. No
    // "completedAt", no "wasLate", no day-count anywhere near it.
    const completed = { ...task, done: true };
    expect(completed.date).toBe("2026-09-10"); // original due date preserved, untouched
    expect(Object.keys(completed).sort()).toEqual(["date", "done", "id", "title"].sort());
    expect(sortOverdueOldestFirst([completed], today)).toEqual([]); // done, so no longer overdue
  });
});

describe("getLocalTomorrow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is exactly local today + 1 day — what the Tomorrow button sets due_date to", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T15:00:00"));
    expect(getLocalToday()).toBe("2026-09-17");
    expect(getLocalTomorrow()).toBe("2026-09-18");
  });

  it("still rolls the month/year correctly at a month/year boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T15:00:00"));
    expect(getLocalTomorrow()).toBe("2027-01-01");
  });
});

describe("chipBelongsOnDay — overdue tasks appear on their original Calendar day", () => {
  const today = "2026-09-17";

  it("an overdue task chip stays on its own original due date, not today", () => {
    const chip = { kind: "task", date: "2026-09-10", done: false };
    expect(chipBelongsOnDay(chip, "2026-09-10", today, true)).toBe(true); // shows on its real day
    expect(chipBelongsOnDay(chip, today, today, true)).toBe(false); // does NOT also show on today
  });

  it("a non-task chip (e.g. a goal deadline) still rolls onto today once overdue — unchanged, existing behavior", () => {
    const chip = { kind: "goal", date: "2026-09-10", done: false };
    expect(chipBelongsOnDay(chip, "2026-09-10", today, true)).toBe(false); // no longer on its old day
    expect(chipBelongsOnDay(chip, today, today, true)).toBe(true); // rolled onto today
  });

  it("a done task chip just shows on its own day like anything else finished", () => {
    const chip = { kind: "task", date: "2026-09-10", done: true };
    expect(chipBelongsOnDay(chip, "2026-09-10", today, true)).toBe(true);
  });

  it("a future task chip shows only on its own future day", () => {
    const chip = { kind: "task", date: "2026-09-20", done: false };
    expect(chipBelongsOnDay(chip, "2026-09-20", today, true)).toBe(true);
    expect(chipBelongsOnDay(chip, today, today, true)).toBe(false);
  });
});

describe("groupItemsByDate — a breakdown's steps all share one title, the difference lives in notes", () => {
  it("every day gets the fallback title, not its own AI-generated step name", () => {
    const items = [
      { title: "Draft outline", date: "2026-09-10" },
      { title: "Write body paragraphs", date: "2026-09-12" },
      { title: "Revise conclusion", date: "2026-09-14" },
    ];
    const result = groupItemsByDate(items, "Chemistry Homework");
    expect(result.map((r) => r.title)).toEqual(["Chemistry Homework", "Chemistry Homework", "Chemistry Homework"]);
  });

  it("puts each day's actual step description in notes instead", () => {
    const items = [{ title: "Draft outline", date: "2026-09-10" }];
    const result = groupItemsByDate(items, "Chemistry Homework");
    expect(result[0].notes).toBe("Draft outline");
  });

  it("joins multiple steps that land on the same day into that day's notes together", () => {
    const items = [
      { title: "Draft outline", date: "2026-09-10" },
      { title: "Gather sources", date: "2026-09-10" },
    ];
    const result = groupItemsByDate(items, "Chemistry Homework");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Chemistry Homework");
    expect(result[0].notes).toBe("Draft outline, Gather sources");
  });

  it("a plain day-by-day schedule with no distinguishing step names gets no notes — nothing to note", () => {
    // The non-AI "Work on: X every day" callers already bake the same title into every
    // item and pass no fallbackTitle — every title already equals the group's own title.
    const items = [
      { title: "Work on: Essay", date: "2026-09-10" },
      { title: "Work on: Essay", date: "2026-09-11" },
    ];
    const result = groupItemsByDate(items);
    expect(result.map((r) => r.title)).toEqual(["Work on: Essay", "Work on: Essay"]);
    expect(result.every((r) => r.notes === null)).toBe(true);
  });
});
