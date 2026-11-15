// Regression test for the "all currently-linked sessions done means the parent item is
// done" rule — used for Assignment/Assessment. Homework's own completion is decided by an
// explicit "whole thing or just today" prompt in App.jsx instead, not this function; see
// the file-level comment in eduAutoComplete.js for why.
import { describe, it, expect } from "vitest";
import { shouldAutoCompleteEduItem } from "./eduAutoComplete";

describe("shouldAutoCompleteEduItem", () => {
  it("does not complete while some linked session is still open", () => {
    expect(shouldAutoCompleteEduItem({ allLinkedSessionsDone: false })).toBe(false);
  });

  it("completes once every currently-linked session is done", () => {
    expect(shouldAutoCompleteEduItem({ allLinkedSessionsDone: true })).toBe(true);
  });
});
