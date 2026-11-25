// dateRangeISO used to silently cap at 30 days, so any due date further out than that
// quietly lost its tail end — a Homework's guaranteed night-before reminder, or the back
// half of an Assignment's "work every day" schedule, would never get created past day 30.
import { describe, it, expect } from "vitest";
import { dateRangeISO } from "./dateHelpers";

describe("dateRangeISO", () => {
  it("returns every day in a range longer than 30 days, including the last one", () => {
    const dates = dateRangeISO("2026-09-01", "2026-11-15"); // 76 days
    expect(dates.length).toBe(76);
    expect(dates[0]).toBe("2026-09-01");
    expect(dates[dates.length - 1]).toBe("2026-11-15");
  });

  it("still returns a short range correctly", () => {
    expect(dateRangeISO("2026-09-01", "2026-09-03")).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });
});
