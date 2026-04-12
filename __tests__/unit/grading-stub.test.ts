import { describe, it, expect } from "vitest";
import { gradeProblem } from "../../lib/grading";
import type { GradeProblemPromptInput } from "../../contracts/types";

const INPUT: GradeProblemPromptInput = {
  assignmentDescription: "Test assignment",
  problemName: "Problem 1",
  problemDescription: "First problem",
  criteria: [
    { criterionId: "c1", description: "Criterion A", points: 3 },
    { criterionId: "c2", description: "Criterion B", points: 5 },
    { criterionId: "c3", description: "Criterion C", points: 2 },
  ],
  submissionText: "Student answer here",
};

describe("gradeProblem (stub)", () => {
  it("returns one score per criterion", async () => {
    const result = await gradeProblem(INPUT);
    expect(result.scores).toHaveLength(3);
  });

  it("earns even-indexed criteria, skips odd", async () => {
    const result = await gradeProblem(INPUT);
    expect(result.scores.map((s) => s.earned)).toEqual([true, false, true]);
  });

  it("feedback contains [STUB] marker", async () => {
    const result = await gradeProblem(INPUT);
    for (const score of result.scores) {
      expect(score.feedback).toContain("[STUB]");
    }
  });

  it("returns matching criterionIds", async () => {
    const result = await gradeProblem(INPUT);
    expect(result.scores.map((s) => s.criterionId)).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
  });
});
