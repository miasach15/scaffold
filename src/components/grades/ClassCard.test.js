// Tests for classPercent's per-category score_mode branch ("sum" vs "average") — the
// two only diverge when a category's items carry unequal point totals, which is exactly
// the case that motivated adding the toggle in the first place.
import { describe, it, expect } from "vitest";
import { classPercent } from "./ClassCard";

const item = (id, earned, possible, categoryId) => ({ id, scoreEarned: earned, scorePossible: possible, gradeCategoryId: categoryId, itemWeight: null });

describe("classPercent — category score_mode", () => {
  it("defaults to sum(earned)/sum(possible) when no scoreMode is set", () => {
    const items = [item("a", 1, 1, "cat1"), item("b", 99, 100, "cat1")];
    const categories = [{ id: "cat1", weight: 100 }];
    // sum/sum: (1+99)/(1+100) = 100/101 = 99.0099...% -> rounds to 99.0
    expect(classPercent(items, categories)).toBe(99);
  });

  it("explicit scoreMode 'sum' matches the default", () => {
    const items = [item("a", 1, 1, "cat1"), item("b", 99, 100, "cat1")];
    const categories = [{ id: "cat1", weight: 100, scoreMode: "sum" }];
    expect(classPercent(items, categories)).toBe(99);
  });

  it("scoreMode 'average' means each item's own percentage instead", () => {
    const items = [item("a", 1, 1, "cat1"), item("b", 99, 100, "cat1")];
    const categories = [{ id: "cat1", weight: 100, scoreMode: "average" }];
    // average of 100% and 99% = 99.5%
    expect(classPercent(items, categories)).toBe(99.5);
  });

  it("different categories can use different modes in the same class", () => {
    const items = [
      item("a", 1, 1, "sum-cat"), item("b", 99, 100, "sum-cat"),
      item("c", 1, 1, "avg-cat"), item("d", 99, 100, "avg-cat"),
    ];
    const categories = [
      { id: "sum-cat", weight: 50, scoreMode: "sum" },
      { id: "avg-cat", weight: 50, scoreMode: "average" },
    ];
    // (99.0 * 0.5) + (99.5 * 0.5) = 99.25, rounded to one decimal
    expect(classPercent(items, categories)).toBe(99.3);
  });
});
