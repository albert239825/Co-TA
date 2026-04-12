import { describe, it, expect } from "vitest";
import {
  createAssignmentSchema,
  uploadSubmissionsSchema,
  batchGradeRequestSchema,
  updateCriterionScoreSchema,
} from "../../lib/validation";

describe("createAssignmentSchema", () => {
  const validInput = {
    name: "HW1",
    description: "Homework 1",
    problems: [
      {
        name: "P1",
        description: "Problem 1",
        sortOrder: 0,
        criteria: [{ description: "C1", points: 5, sortOrder: 0 }],
      },
    ],
  };

  it("accepts valid input", () => {
    const result = createAssignmentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createAssignmentSchema.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects no problems", () => {
    const result = createAssignmentSchema.safeParse({
      ...validInput,
      problems: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("uploadSubmissionsSchema", () => {
  it("rejects missing fileName", () => {
    const result = uploadSubmissionsSchema.safeParse({
      assignmentId: "00000000-0000-0000-0000-000000000000",
      files: [{ studentIdentifier: "alice", fileContent: "content" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input with files", () => {
    const result = uploadSubmissionsSchema.safeParse({
      assignmentId: "00000000-0000-0000-0000-000000000000",
      files: [
        {
          studentIdentifier: "alice",
          fileName: "hw1.txt",
          fileContent: "content",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("batchGradeRequestSchema", () => {
  it("accepts empty submissionIds (grade all pending)", () => {
    const result = batchGradeRequestSchema.safeParse({
      assignmentId: "00000000-0000-0000-0000-000000000000",
      submissionIds: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCriterionScoreSchema", () => {
  it("accepts null overrideScore (clear override)", () => {
    const result = updateCriterionScoreSchema.safeParse({
      overrideScore: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative overrideScore", () => {
    const result = updateCriterionScoreSchema.safeParse({
      overrideScore: -1,
    });
    expect(result.success).toBe(false);
  });
});
