import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDb,
  jsonRequest,
  getRequest,
  createTestAssignment,
  uploadTestSubmissions,
} from "../helpers";

beforeEach(() => resetDb());

describe("POST /api/submissions", () => {
  it("uploads submissions with correct shape", async () => {
    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 2);

    expect(subs).toHaveLength(2);
    expect(subs[0].status).toBe("pending");
    expect(subs[0].totalScore).toBeNull();
    expect(subs[0].maxScore).toBe(20);
    expect(subs[0].problemScores).toHaveLength(2);
  });

  it("rejects submissions with wrong field name", async () => {
    const { POST } = await import("../../src/app/api/submissions/route");
    const assignment = await createTestAssignment();

    // Use "submissions" instead of "files" — common mistake
    const res = await POST(
      jsonRequest("http://localhost/api/submissions", {
        assignmentId: assignment.id,
        submissions: [
          {
            studentIdentifier: "alice",
            fileName: "hw.txt",
            fileContent: "content",
          },
        ],
      })
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/assignments/[id]/submissions", () => {
  it("lists submissions for an assignment", async () => {
    const { GET } = await import(
      "../../src/app/api/assignments/[id]/submissions/route"
    );

    const assignment = await createTestAssignment();
    await uploadTestSubmissions(assignment.id, 3);

    const res = await GET(
      getRequest(
        `http://localhost/api/assignments/${assignment.id}/submissions`
      ),
      { params: { id: assignment.id } }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(3);
    // Ungraded submissions should have null totalScore
    expect(data[0].totalScore).toBeNull();
  });
});

describe("GET /api/submissions/[id]", () => {
  it("returns detail for ungraded submission", async () => {
    const { GET } = await import("../../src/app/api/submissions/[id]/route");

    const assignment = await createTestAssignment();
    const subs = await uploadTestSubmissions(assignment.id, 1);
    const subId = subs[0].id;

    const res = await GET(
      getRequest(`http://localhost/api/submissions/${subId}`),
      { params: { id: subId } }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gradingResult).toBeNull();
    expect(data.totalScore).toBe(0);
    expect(data.maxScore).toBe(20);
    expect(data.status).toBe("pending");
  });
});
