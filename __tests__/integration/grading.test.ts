import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDb,
  jsonRequest,
  getRequest,
  createTestAssignment,
  uploadTestSubmissions,
  gradeAndWait,
} from "../helpers";

beforeEach(() => resetDb());

describe("POST /api/grade/batch", () => {
  it("grades all pending submissions", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 2);

    const gradeRes = await gradeAndWait(assignment.id);

    expect(gradeRes.started).toBe(2);
    expect(gradeRes.streamUrl).toContain(assignment.id);

    // Verify both are graded
    const { GET } = await import("../../src/app/api/submissions/[id]/route");
    for (const sub of subs) {
      const res = await GET(
        getRequest(`http://localhost/api/submissions/${sub.id}`),
        { params: { id: sub.id } }
      );
      const data = await res.json();
      expect(data.status).toBe("graded");
      expect(data.gradingResult).not.toBeNull();
      // Stub behavior:
      //   P1 (3+5+2 pts): idx0 earned (3), idx1 not (0), idx2 earned but
      //     flagged needsReview (every 3rd) → clamped to 0. P1 = 3.
      //   P2 (4+6 pts): idx0 earned (4), idx1 not (0). P2 = 4.
      //   Total = 7.
      expect(data.totalScore).toBe(7);
    }
  });

  it("grades specific submissions by ID", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 3);

    // Grade only the first submission
    const gradeRes = await gradeAndWait(assignment.id, [subs[0].id]);

    expect(gradeRes.started).toBe(1);

    // First should be graded
    const { GET } = await import("../../src/app/api/submissions/[id]/route");
    const res1 = await GET(
      getRequest(`http://localhost/api/submissions/${subs[0].id}`),
      { params: { id: subs[0].id } }
    );
    expect((await res1.json()).status).toBe("graded");

    // Others should still be pending
    const res2 = await GET(
      getRequest(`http://localhost/api/submissions/${subs[1].id}`),
      { params: { id: subs[1].id } }
    );
    expect((await res2.json()).status).toBe("pending");
  });

  it("returns started=0 for no pending submissions", async () => {
    const assignment = await createTestAssignment();
    // No submissions uploaded
    const gradeRes = await gradeAndWait(assignment.id);
    expect(gradeRes.started).toBe(0);
  });

  it("re-grade replaces old grading result", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    const subId = subs[0].id;

    // Grade once
    await gradeAndWait(assignment.id);

    const { GET } = await import("../../src/app/api/submissions/[id]/route");
    const res1 = await GET(
      getRequest(`http://localhost/api/submissions/${subId}`),
      { params: { id: subId } }
    );
    const firstGrade = await res1.json();
    const firstResultId = firstGrade.gradingResult.id;

    // Re-grade (submission is now "graded", need to reset to pending first)
    // Actually, batch grade with specific IDs should grade regardless of status
    // Let's force via specific ID
    const { POST } = await import("../../src/app/api/grade/batch/route");
    await POST(
      jsonRequest("http://localhost/api/grade/batch", {
        assignmentId: assignment.id,
        submissionIds: [subId],
      })
    );
    await new Promise((r) => setTimeout(r, 200));

    const res2 = await GET(
      getRequest(`http://localhost/api/submissions/${subId}`),
      { params: { id: subId } }
    );
    const secondGrade = await res2.json();

    // New grading result should have a different ID
    expect(secondGrade.gradingResult.id).not.toBe(firstResultId);
    // Score should be the same (deterministic stub) — see the first
    // test in this file for the breakdown of why this is 7.
    expect(secondGrade.totalScore).toBe(7);
  });

  it("returns 404 for nonexistent assignment", async () => {
    const { POST } = await import("../../src/app/api/grade/batch/route");
    const res = await POST(
      jsonRequest("http://localhost/api/grade/batch", {
        assignmentId: "00000000-0000-0000-0000-000000000000",
        submissionIds: [],
      })
    );
    expect(res.status).toBe(404);
  });
});
