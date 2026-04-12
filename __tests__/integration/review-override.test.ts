import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDb,
  getRequest,
  patchRequest,
  createTestAssignment,
  uploadTestSubmissions,
  gradeAndWait,
} from "../helpers";

beforeEach(() => resetDb());

/** Helper: get a criterion score from a graded submission, returning enough info for assertions */
async function getCriterionScore(subId: string) {
  const { GET } = await import("../../src/app/api/submissions/[id]/route");
  const res = await GET(
    getRequest(`http://localhost/api/submissions/${subId}`),
    { params: { id: subId } }
  );
  const data = await res.json();
  const criterion = data.gradingResult.problems[0].criteria[0];
  return {
    id: criterion.criterionScoreId as string,
    points: criterion.points as number,
    earned: criterion.earned as boolean,
    effectiveScore: criterion.effectiveScore as number,
    totalScore: data.totalScore as number,
  };
}

describe("PATCH /api/criterion-scores/[id]", () => {
  it("overrides a criterion score and recomputes total", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    const cs = await getCriterionScore(subs[0].id);

    const { PATCH } = await import(
      "../../src/app/api/criterion-scores/[id]/route"
    );
    const res = await PATCH(
      patchRequest(`http://localhost/api/criterion-scores/${cs.id}`, {
        overrideScore: 1,
      }),
      { params: { id: cs.id } }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.criterionScoreId).toBe(cs.id);
    expect(data.effectiveScore).toBe(1);
    // newTotal = originalTotal - originalEffective + 1
    expect(data.newTotalScore).toBe(cs.totalScore - cs.effectiveScore + 1);
  });

  it("clears override and reverts to earned-based score", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    const cs = await getCriterionScore(subs[0].id);
    const originalEffective = cs.effectiveScore; // earned ? points : 0

    const { PATCH } = await import(
      "../../src/app/api/criterion-scores/[id]/route"
    );

    // Set override
    await PATCH(
      patchRequest(`http://localhost/api/criterion-scores/${cs.id}`, {
        overrideScore: 1,
      }),
      { params: { id: cs.id } }
    );

    // Clear override
    const res = await PATCH(
      patchRequest(`http://localhost/api/criterion-scores/${cs.id}`, {
        overrideScore: null,
      }),
      { params: { id: cs.id } }
    );

    const data = await res.json();
    // Reverts to earned-based value
    expect(data.effectiveScore).toBe(originalEffective);
    expect(data.newTotalScore).toBe(cs.totalScore);
  });

  it("override=0 on earned criterion gives effectiveScore=0", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    const cs = await getCriterionScore(subs[0].id);

    const { PATCH } = await import(
      "../../src/app/api/criterion-scores/[id]/route"
    );
    const res = await PATCH(
      patchRequest(`http://localhost/api/criterion-scores/${cs.id}`, {
        overrideScore: 0,
      }),
      { params: { id: cs.id } }
    );

    const data = await res.json();
    expect(data.effectiveScore).toBe(0);
    // Total should decrease by whatever the criterion was worth
    expect(data.newTotalScore).toBe(cs.totalScore - cs.effectiveScore);
  });

  it("returns 404 for nonexistent criterion score", async () => {
    const { PATCH } = await import(
      "../../src/app/api/criterion-scores/[id]/route"
    );
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await PATCH(
      patchRequest(
        `http://localhost/api/criterion-scores/${fakeId}`,
        { overrideScore: 5 }
      ),
      { params: { id: fakeId } }
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/submissions/[id]/review", () => {
  it("marks a graded submission as reviewed", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    const { PATCH } = await import(
      "../../src/app/api/submissions/[id]/review/route"
    );
    const res = await PATCH(
      new Request(`http://localhost/api/submissions/${subs[0].id}/review`, {
        method: "PATCH",
      }),
      { params: { id: subs[0].id } }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("reviewed");
  });

  it("rejects review on pending submission", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    // Don't grade — submission is still "pending"

    const { PATCH } = await import(
      "../../src/app/api/submissions/[id]/review/route"
    );
    const res = await PATCH(
      new Request(`http://localhost/api/submissions/${subs[0].id}/review`, {
        method: "PATCH",
      }),
      { params: { id: subs[0].id } }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("graded");
  });

  it("rejects double review", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    const { PATCH } = await import(
      "../../src/app/api/submissions/[id]/review/route"
    );

    // First review
    await PATCH(
      new Request(`http://localhost/api/submissions/${subs[0].id}/review`, {
        method: "PATCH",
      }),
      { params: { id: subs[0].id } }
    );

    // Second review should fail
    const res = await PATCH(
      new Request(`http://localhost/api/submissions/${subs[0].id}/review`, {
        method: "PATCH",
      }),
      { params: { id: subs[0].id } }
    );

    expect(res.status).toBe(400);
  });
});
