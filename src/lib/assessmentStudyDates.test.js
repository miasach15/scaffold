// Tests for assessmentStudyDates — the "study for a test" scheduler. Three rules, in
// order of priority per the product ask that created this: the day right before the test
// is non-negotiable, studying never starts more than a week out no matter how big a
// count was requested, and whichever of the remaining candidate days are least loaded
// win over which one is literally closest to the test.
import { describe, it, expect, afterEach, vi } from "vitest";
import { assessmentStudyDates } from "./dateHelpers";

describe("assessmentStudyDates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("always includes the day right before the test as the last session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    const dates = assessmentStudyDates("2026-09-10", 3, [], []);
    expect(dates[dates.length - 1]).toBe("2026-09-09");
  });

  it("never uses a distinct day more than a week before the test, even when a much bigger count is requested (packs extras instead)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    const dates = assessmentStudyDates("2026-09-30", 20, [], []);
    expect(dates.length).toBe(20); // every requested session still gets a real date
    expect(dates.every((d) => d >= "2026-09-23")).toBe(true); // never earlier than 7 days before 9/29 (ISO strings sort chronologically)
    expect(dates[dates.length - 1]).toBe("2026-09-29");
  });

  it("falls back to today when the day before the test has already passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00"));
    const dates = assessmentStudyDates("2026-09-10", 5, [], []); // due today — "the day before" is yesterday, already gone
    expect(dates).toEqual(["2026-09-10"]);
  });

  it("picks the least-loaded of the remaining candidate days when fewer sessions are needed than the full week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    // Window is 9/3 (7 days before 9/9) through 9/9. 9/9 is forced. Pick 1 more from the
    // other 6 days — make every day heavily loaded except 9/5, which should win.
    const tasks = ["2026-09-03", "2026-09-04", "2026-09-06", "2026-09-07", "2026-09-08"].map((date, i) => ({ id: `t${i}`, date, duration: 300 }));
    const dates = assessmentStudyDates("2026-09-10", 2, tasks, []);
    expect(dates).toEqual(["2026-09-05", "2026-09-09"]);
  });

  it("prefers the day closer to the test when load is tied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    // No existing load anywhere in the window — every non-forced candidate day ties at 0,
    // so the nearer-to-the-test one should win the second slot.
    const dates = assessmentStudyDates("2026-09-10", 2, [], []);
    expect(dates).toEqual(["2026-09-08", "2026-09-09"]);
  });

  it("uses the whole available window (no load-based trimming) when the count exactly matches it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    const dates = assessmentStudyDates("2026-09-10", 7, [], []);
    expect(dates).toEqual(["2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09"]);
  });

  it("packs extra sessions onto existing days (never fewer dates than requested) when an AI breakdown asks for more steps than the week allows", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
    const dates = assessmentStudyDates("2026-09-10", 10, [], []);
    expect(dates.length).toBe(10); // never silently returns fewer dates than were asked for
    expect(dates[dates.length - 1]).toBe("2026-09-09"); // still ends on the night before
    expect(new Set(dates).size).toBeLessThanOrEqual(7); // packed within the same week-out window, not spilling earlier
  });
});
