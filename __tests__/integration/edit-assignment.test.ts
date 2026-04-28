import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDb,
  createTestAssignment,
  uploadTestSubmissions,
  gradeAndWait,
  jsonRequest,
} from "../helpers";
import type {
  AssignmentResponse,
  EditAssignmentRequest,
  EditAssignmentResponse,
} from "../../contracts/types";

beforeEach(() => resetDb());

async function putAssignment(id: string, body: EditAssignmentRequest) {
  const { PUT } = await import(
    "../../src/app/api/assignments/[id]/route"
  );
  return PUT(
    jsonRequest(`http://localhost/api/assignments/${id}`, body, "PUT"),
    { params: { id } }
  );
}

async function getAssignment(id: string) {
  const { GET } = await import(
    "../../src/app/api/assignments/[id]/route"
  );
  return GET(
    new Request(`http://localhost/api/assignments/${id}`),
    { params: { id } }
  );
}

describe("PUT /api/assignments/[id]", () => {
  it("updates assignment name and description", async () => {
    const created: AssignmentResponse = await createTestAssignment();

    const editReq: EditAssignmentRequest = {
      name: "Updated Name",
      description: "Updated description",
      problems: created.problems.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        criteria: p.criteria.map((c) => ({
          id: c.id,
          description: c.description,
          points: c.points,
          sortOrder: c.sortOrder,
        })),
      })),
    };

    const res = await putAssignment(created.id, editReq);
    expect(res.status).toBe(200);

    const data: EditAssignmentResponse = await res.json();
    expect(data.name).toBe("Updated Name");
    expect(data.description).toBe("Updated description");
    expect(data.maxScore).toBe(20); // unchanged
    expect(data.problems).toHaveLength(2);
    expect(data.submissionsReset).toBe(0);
  });

  it("preserves problem and criterion IDs when editing", async () => {
    const created: AssignmentResponse = await createTestAssignment();

    const editReq: EditAssignmentRequest = {
      name: created.name,
      description: created.description,
      problems: created.problems.map((p) => ({
        id: p.id,
        name: `${p.name} (edited)`,
        description: p.description,
        sortOrder: p.sortOrder,
        criteria: p.criteria.map((c) => ({
          id: c.id,
          description: c.description,
          points: c.points,
          sortOrder: c.sortOrder,
        })),
      })),
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();

    // IDs should be preserved
    expect(data.problems[0].id).toBe(created.problems[0].id);
    expect(data.problems[1].id).toBe(created.problems[1].id);
    expect(data.problems[0].criteria[0].id).toBe(
      created.problems[0].criteria[0].id
    );
  });

  it("adds a new problem", async () => {
    const created: AssignmentResponse = await createTestAssignment();

    const editReq: EditAssignmentRequest = {
      name: created.name,
      description: created.description,
      problems: [
        ...created.problems.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          sortOrder: p.sortOrder,
          criteria: p.criteria.map((c) => ({
            id: c.id,
            description: c.description,
            points: c.points,
            sortOrder: c.sortOrder,
          })),
        })),
        {
          name: "Problem 3",
          description: "Third problem",
          sortOrder: 2,
          criteria: [
            { description: "Criterion 3a", points: 10, sortOrder: 0 },
          ],
        },
      ],
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();

    expect(data.problems).toHaveLength(3);
    expect(data.maxScore).toBe(30); // 20 + 10
  });

  it("removes a problem", async () => {
    const created: AssignmentResponse = await createTestAssignment();

    const editReq: EditAssignmentRequest = {
      name: created.name,
      description: created.description,
      problems: [
        {
          id: created.problems[0].id,
          name: created.problems[0].name,
          description: created.problems[0].description,
          sortOrder: created.problems[0].sortOrder,
          criteria: created.problems[0].criteria.map((c) => ({
            id: c.id,
            description: c.description,
            points: c.points,
            sortOrder: c.sortOrder,
          })),
        },
      ],
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();

    expect(data.problems).toHaveLength(1);
    expect(data.maxScore).toBe(10); // only first problem's 3+5+2
  });

  it("adds a new criterion to an existing problem", async () => {
    const created: AssignmentResponse = await createTestAssignment();

    const editReq: EditAssignmentRequest = {
      name: created.name,
      description: created.description,
      problems: created.problems.map((p, pi) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        criteria: [
          ...p.criteria.map((c) => ({
            id: c.id,
            description: c.description,
            points: c.points,
            sortOrder: c.sortOrder,
          })),
          ...(pi === 0
            ? [
                {
                  description: "New criterion",
                  points: 7,
                  sortOrder: p.criteria.length,
                },
              ]
            : []),
        ],
      })),
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();

    expect(data.problems[0].criteria).toHaveLength(4);
    expect(data.maxScore).toBe(27); // 20 + 7
  });

  it("returns 404 for nonexistent assignment", async () => {
    const res = await putAssignment(
      "00000000-0000-0000-0000-000000000000",
      {
        name: "Nope",
        description: "Nope",
        problems: [
          {
            name: "P1",
            description: "D1",
            sortOrder: 0,
            criteria: [
              { description: "C1", points: 5, sortOrder: 0 },
            ],
          },
        ],
      }
    );
    expect(res.status).toBe(404);
  });

  it("rejects invalid body", async () => {
    const created: AssignmentResponse = await createTestAssignment();
    const { PUT } = await import(
      "../../src/app/api/assignments/[id]/route"
    );
    const res = await PUT(
      jsonRequest(
        `http://localhost/api/assignments/${created.id}`,
        { name: "" },
        "PUT"
      ),
      { params: { id: created.id } }
    );
    expect(res.status).toBe(400);
  });

  it("resets graded submissions when resetGrades=true", async () => {
    const created: AssignmentResponse = await createTestAssignment();
    await uploadTestSubmissions(created.id, 2);
    await gradeAndWait(created.id);

    // Verify submissions are graded
    const { GET: getSubs } = await import(
      "../../src/app/api/assignments/[id]/submissions/route"
    );
    const subsRes = await getSubs(
      new Request(
        `http://localhost/api/assignments/${created.id}/submissions`
      ),
      { params: { id: created.id } }
    );
    const subs = await subsRes.json();
    expect(subs.every((s: { status: string }) => s.status === "graded")).toBe(
      true
    );

    // Edit with resetGrades
    const editReq: EditAssignmentRequest = {
      name: created.name,
      description: created.description,
      resetGrades: true,
      problems: created.problems.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        criteria: p.criteria.map((c) => ({
          id: c.id,
          description: c.description,
          points: c.points + 1,
          sortOrder: c.sortOrder,
        })),
      })),
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();
    expect(data.submissionsReset).toBe(2);

    // Verify submissions are back to pending
    const subsRes2 = await getSubs(
      new Request(
        `http://localhost/api/assignments/${created.id}/submissions`
      ),
      { params: { id: created.id } }
    );
    const subs2 = await subsRes2.json();
    expect(
      subs2.every((s: { status: string }) => s.status === "pending")
    ).toBe(true);
  });

  it("keeps graded submissions when resetGrades is false", async () => {
    const created: AssignmentResponse = await createTestAssignment();
    await uploadTestSubmissions(created.id, 1);
    await gradeAndWait(created.id);

    const editReq: EditAssignmentRequest = {
      name: "Edited Name",
      description: created.description,
      resetGrades: false,
      problems: created.problems.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        criteria: p.criteria.map((c) => ({
          id: c.id,
          description: c.description,
          points: c.points,
          sortOrder: c.sortOrder,
        })),
      })),
    };

    const res = await putAssignment(created.id, editReq);
    const data: EditAssignmentResponse = await res.json();
    expect(data.submissionsReset).toBe(0);

    // Submissions should still be graded
    const { GET: getSubs } = await import(
      "../../src/app/api/assignments/[id]/submissions/route"
    );
    const subsRes = await getSubs(
      new Request(
        `http://localhost/api/assignments/${created.id}/submissions`
      ),
      { params: { id: created.id } }
    );
    const subs = await subsRes.json();
    expect(
      subs.every((s: { status: string }) => s.status === "graded")
    ).toBe(true);
  });
});
