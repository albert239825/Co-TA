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

describe("GET /api/export", () => {
  it("exports CSV with correct headers and scores", async () => {
    const assignment = await createTestAssignment();
    await uploadTestSubmissions(assignment.id, 2);
    await gradeAndWait(assignment.id);

    const { GET } = await import("../../src/app/api/export/route");
    const res = await GET(
      getRequest(
        `http://localhost/api/export?assignmentId=${assignment.id}&format=csv`
      )
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const csv = await res.text();
    const lines = csv.split("\n");

    // Header: studentIdentifier, Problem 1, Problem 2, totalScore, feedback
    expect(lines[0]).toContain("studentIdentifier");
    expect(lines[0]).toContain("Problem 1");
    expect(lines[0]).toContain("Problem 2");
    expect(lines[0]).toContain("totalScore");

    // 2 data rows
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 data rows
  });

  it("exports CSV with header only when no graded submissions", async () => {
    const assignment = await createTestAssignment();
    // Upload but don't grade — status is "pending", excluded from export
    await uploadTestSubmissions(assignment.id, 1);

    const { GET } = await import("../../src/app/api/export/route");
    const res = await GET(
      getRequest(
        `http://localhost/api/export?assignmentId=${assignment.id}&format=csv`
      )
    );

    expect(res.status).toBe(200);
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.trim());
    // Only the header row
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("studentIdentifier");
  });

  it("reflects overrides in exported scores", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    await gradeAndWait(assignment.id);

    // Get first criterion score info to know its effective value
    const { GET: getSub } = await import(
      "../../src/app/api/submissions/[id]/route"
    );
    const subRes = await getSub(
      getRequest(`http://localhost/api/submissions/${subs[0].id}`),
      { params: { id: subs[0].id } }
    );
    const subData = await subRes.json();
    const criterion = subData.gradingResult.problems[0].criteria[0];
    const csId = criterion.criterionScoreId;
    const originalEffective = criterion.effectiveScore;
    const originalTotal = subData.totalScore;

    const { PATCH } = await import(
      "../../src/app/api/criterion-scores/[id]/route"
    );
    await PATCH(
      patchRequest(`http://localhost/api/criterion-scores/${csId}`, {
        overrideScore: 0,
      }),
      { params: { id: csId } }
    );

    // Export and check total reflects override
    const { GET } = await import("../../src/app/api/export/route");
    const res = await GET(
      getRequest(
        `http://localhost/api/export?assignmentId=${assignment.id}&format=csv`
      )
    );

    const csv = await res.text();
    const lines = csv.split("\n");
    // Format: studentIdentifier,P1Score,P2Score,totalScore,feedback
    const dataRow = lines[1].split(",");
    // totalScore is the second-to-last column
    const totalIdx = dataRow.length - 2;
    const expectedTotal = originalTotal - originalEffective;
    expect(dataRow[totalIdx]).toBe(String(expectedTotal));
  });
});
