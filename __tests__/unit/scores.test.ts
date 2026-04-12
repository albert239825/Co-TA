import { describe, it, expect } from "vitest";
import {
  computeEffectiveScore,
  computeProblemScore,
  computeSubmissionTotal,
  computeAssignmentMaxScore,
} from "../../lib/scores";

describe("computeEffectiveScore", () => {
  it("returns points when earned with no override", () => {
    expect(computeEffectiveScore(true, 5, null)).toBe(5);
  });

  it("returns 0 when not earned with no override", () => {
    expect(computeEffectiveScore(false, 5, null)).toBe(0);
  });

  it("override takes precedence over earned=true", () => {
    expect(computeEffectiveScore(true, 5, 3)).toBe(3);
  });

  it("override takes precedence over earned=false", () => {
    expect(computeEffectiveScore(false, 5, 3)).toBe(3);
  });

  it("override=0 is valid and does not fall through", () => {
    // This is the tricky edge case: 0 is not null
    expect(computeEffectiveScore(true, 5, 0)).toBe(0);
  });
});

describe("computeProblemScore", () => {
  it("sums effective scores for mixed earned/not-earned", () => {
    const result = computeProblemScore([
      { earned: true, points: 3, overrideScore: null },
      { earned: false, points: 5, overrideScore: null },
    ]);
    expect(result).toEqual({ score: 3, maxScore: 8 });
  });

  it("handles empty criteria", () => {
    expect(computeProblemScore([])).toEqual({ score: 0, maxScore: 0 });
  });

  it("respects overrides in aggregation", () => {
    const result = computeProblemScore([
      { earned: true, points: 3, overrideScore: 1 },
      { earned: false, points: 5, overrideScore: 4 },
    ]);
    expect(result).toEqual({ score: 5, maxScore: 8 });
  });
});

describe("computeSubmissionTotal", () => {
  it("sums across multiple problems", () => {
    const result = computeSubmissionTotal([
      {
        criteria: [
          { earned: true, points: 3, overrideScore: null },
          { earned: false, points: 5, overrideScore: null },
        ],
      },
      {
        criteria: [
          { earned: true, points: 4, overrideScore: null },
        ],
      },
    ]);
    expect(result).toEqual({ totalScore: 7, maxScore: 12 });
  });
});

describe("computeAssignmentMaxScore", () => {
  it("sums all criteria points", () => {
    expect(computeAssignmentMaxScore([3, 5, 2])).toBe(10);
  });

  it("returns 0 for empty array", () => {
    expect(computeAssignmentMaxScore([])).toBe(0);
  });
});
