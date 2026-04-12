// Test utilities: DB reset, test data factories, request helpers
import { sqlite } from "../db";
import type { CreateAssignmentRequest } from "../contracts/types";

/** Clear all tables between tests (reverse dependency order) */
export function resetDb() {
  sqlite.exec(`
    DELETE FROM criterion_scores;
    DELETE FROM grading_results;
    DELETE FROM submissions;
    DELETE FROM rubric_criteria;
    DELETE FROM problems;
    DELETE FROM assignments;
  `);
}

/** Standard test assignment: 2 problems, 5 criteria, maxScore=20 */
export const TEST_ASSIGNMENT: CreateAssignmentRequest = {
  name: "Test Assignment",
  description: "A test assignment for grading",
  problems: [
    {
      name: "Problem 1",
      description: "First problem",
      sortOrder: 0,
      criteria: [
        { description: "Criterion 1a", points: 3, sortOrder: 0 },
        { description: "Criterion 1b", points: 5, sortOrder: 1 },
        { description: "Criterion 1c", points: 2, sortOrder: 2 },
      ],
    },
    {
      name: "Problem 2",
      description: "Second problem",
      sortOrder: 1,
      criteria: [
        { description: "Criterion 2a", points: 4, sortOrder: 0 },
        { description: "Criterion 2b", points: 6, sortOrder: 1 },
      ],
    },
  ],
};

/** Build a JSON POST request */
export function jsonRequest(
  url: string,
  body: unknown,
  method = "POST"
): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Build a GET request */
export function getRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

/** Build a PATCH request with JSON body */
export function patchRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Helper: create a test assignment via the route handler, return response data */
export async function createTestAssignment() {
  const { POST } = await import("../src/app/api/assignments/route");
  const res = await POST(
    jsonRequest("http://localhost/api/assignments", TEST_ASSIGNMENT)
  );
  return res.json();
}

/** Helper: upload test submissions for an assignment */
export async function uploadTestSubmissions(
  assignmentId: string,
  count = 2
) {
  const { POST } = await import("../src/app/api/submissions/route");
  const files = Array.from({ length: count }, (_, i) => ({
    studentIdentifier: `student-${i + 1}`,
    fileName: `submission-${i + 1}.txt`,
    fileContent: `This is the submission content for student ${i + 1}.`,
  }));

  const res = await POST(
    jsonRequest("http://localhost/api/submissions", {
      assignmentId,
      files,
    })
  );
  return res.json();
}

/** Helper: trigger batch grading and wait for completion */
export async function gradeAndWait(
  assignmentId: string,
  submissionIds: string[] = []
) {
  const { POST } = await import("../src/app/api/grade/batch/route");
  const res = await POST(
    jsonRequest("http://localhost/api/grade/batch", {
      assignmentId,
      submissionIds,
    })
  );
  const data = await res.json();

  // Wait for fire-and-forget grading to complete (stub is near-instant)
  await new Promise((r) => setTimeout(r, 200));

  return data;
}
