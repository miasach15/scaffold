// Regression tests for the "completing one Homework session finished the whole assignment
// early, which then hid every later day's still-scheduled reminder from Today/Dashboard"
// bug — see the file-level comment in eduAutoComplete.js.
import { describe, it, expect } from "vitest";
import { shouldAutoCompleteEduItem } from "./eduAutoComplete";

describe("shouldAutoCompleteEduItem", () => {
  it("never completes if some linked session is still open", () => {
    expect(shouldAutoCompleteEduItem({ eduItemType: "Homework", eduItemDueDate: "2026-10-20", sessionDate: "2026-10-19", allLinkedSessionsDone: false })).toBe(false);
  });

  it("Homework: does NOT complete early when the only materialized session isn't the last-call reminder", () => {
    // Due in several days, but only today's session exists right now (e.g. the rest got
    // skipped for crowding, or haven't reflowed in yet) — finishing today's shouldn't
    // finish the whole assignment, since more days are still supposed to get reminders.
    expect(shouldAutoCompleteEduItem({ eduItemType: "Homework", eduItemDueDate: "2026-10-25", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(false);
  });

  it("Homework: completes once the finished session IS the night-before last-call reminder", () => {
    expect(shouldAutoCompleteEduItem({ eduItemType: "Homework", eduItemDueDate: "2026-10-17", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(true);
  });

  it("Homework due tomorrow (single session = today = the last-call reminder) completes", () => {
    expect(shouldAutoCompleteEduItem({ eduItemType: "Homework", eduItemDueDate: "2026-10-17", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(true);
  });

  it("Homework: an overdue-reflowed session dated past the due date still counts as last-call", () => {
    expect(shouldAutoCompleteEduItem({ eduItemType: "Homework", eduItemDueDate: "2026-10-14", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(true);
  });

  it("Assignment/Assessment sessions aren't pre-scheduled, so all-done is always enough", () => {
    expect(shouldAutoCompleteEduItem({ eduItemType: "Assignment", eduItemDueDate: "2026-10-25", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(true);
    expect(shouldAutoCompleteEduItem({ eduItemType: "Assessment", eduItemDueDate: "2026-10-25", sessionDate: "2026-10-16", allLinkedSessionsDone: true })).toBe(true);
  });
});
