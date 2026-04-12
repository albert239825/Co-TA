import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, TEST_ASSIGNMENT, jsonRequest, getRequest } from "../helpers";

beforeEach(() => resetDb());

describe("POST /api/assignments", () => {
  it("creates an assignment with correct shape", async () => {
    const { POST } = await import("../../src/app/api/assignments/route");
    const res = await POST(
      jsonRequest("http://localhost/api/assignments", TEST_ASSIGNMENT)
    );

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.name).toBe("Test Assignment");
    expect(data.maxScore).toBe(20); // 3+5+2+4+6
    expect(data.problems).toHaveLength(2);
    expect(data.problems[0].criteria).toHaveLength(3);
    expect(data.problems[1].criteria).toHaveLength(2);
    expect(data.id).toBeDefined();
    expect(data.createdAt).toBeDefined();
  });

  it("rejects empty body with 400", async () => {
    const { POST } = await import("../../src/app/api/assignments/route");
    const res = await POST(
      jsonRequest("http://localhost/api/assignments", {})
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Validation failed");
  });
});

describe("GET /api/assignments", () => {
  it("lists created assignments", async () => {
    const { POST, GET } = await import("../../src/app/api/assignments/route");

    // Create 2 assignments
    await POST(jsonRequest("http://localhost/api/assignments", TEST_ASSIGNMENT));
    await POST(
      jsonRequest("http://localhost/api/assignments", {
        ...TEST_ASSIGNMENT,
        name: "Second Assignment",
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });
});

describe("GET /api/assignments/[id]", () => {
  it("returns a single assignment", async () => {
    const { POST } = await import("../../src/app/api/assignments/route");
    const { GET } = await import("../../src/app/api/assignments/[id]/route");

    const createRes = await POST(
      jsonRequest("http://localhost/api/assignments", TEST_ASSIGNMENT)
    );
    const created = await createRes.json();

    const res = await GET(
      getRequest(`http://localhost/api/assignments/${created.id}`),
      { params: { id: created.id } }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(created.id);
    expect(data.maxScore).toBe(20);
  });

  it("returns 404 for nonexistent ID", async () => {
    const { GET } = await import("../../src/app/api/assignments/[id]/route");
    const res = await GET(
      getRequest("http://localhost/api/assignments/nonexistent"),
      { params: { id: "00000000-0000-0000-0000-000000000000" } }
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/assignments/[id]", () => {
  it("deletes and cascades to children", async () => {
    const { POST } = await import("../../src/app/api/assignments/route");
    const { DELETE } = await import(
      "../../src/app/api/assignments/[id]/route"
    );
    const { GET } = await import("../../src/app/api/assignments/[id]/route");

    const createRes = await POST(
      jsonRequest("http://localhost/api/assignments", TEST_ASSIGNMENT)
    );
    const created = await createRes.json();

    const delRes = await DELETE(
      new Request(`http://localhost/api/assignments/${created.id}`, {
        method: "DELETE",
      }),
      { params: { id: created.id } }
    );
    expect(delRes.status).toBe(204);

    // Verify it's gone
    const getRes = await GET(
      getRequest(`http://localhost/api/assignments/${created.id}`),
      { params: { id: created.id } }
    );
    expect(getRes.status).toBe(404);
  });
});
