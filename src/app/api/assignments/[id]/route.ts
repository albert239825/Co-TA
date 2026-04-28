import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db";
import * as schema from "../../../../../db/schema";
import {
  updateAssignmentSchema,
  parseBody,
} from "../../../../../lib/validation";
import type {
  AssignmentResponse,
  ProblemResponse,
  CriterionResponse,
  ApiError,
  UpdateAssignmentResponse,
} from "../../../../../contracts/types";

// ─── Helper: build full AssignmentResponse for a given ID ──────
async function buildAssignmentResponse(
  assignmentId: string
): Promise<AssignmentResponse | null> {
  const assignment = await db
    .select()
    .from(schema.assignments)
    .where(eq(schema.assignments.id, assignmentId))
    .get();

  if (!assignment) return null;

  const probs = await db
    .select()
    .from(schema.problems)
    .where(eq(schema.problems.assignmentId, assignmentId))
    .orderBy(schema.problems.sortOrder)
    .all();

  let assignmentMaxScore = 0;
  const problemResponses: ProblemResponse[] = [];

  for (const prob of probs) {
    const criteria = await db
      .select()
      .from(schema.rubricCriteria)
      .where(eq(schema.rubricCriteria.problemId, prob.id))
      .orderBy(schema.rubricCriteria.sortOrder)
      .all();

    let problemMaxScore = 0;
    const criteriaResponses: CriterionResponse[] = criteria.map((c) => {
      problemMaxScore += c.points;
      return {
        id: c.id,
        description: c.description,
        points: c.points,
        sortOrder: c.sortOrder,
      };
    });

    assignmentMaxScore += problemMaxScore;
    problemResponses.push({
      id: prob.id,
      name: prob.name,
      description: prob.description,
      sortOrder: prob.sortOrder,
      maxScore: problemMaxScore,
      criteria: criteriaResponses,
    });
  }

  return {
    id: assignment.id,
    name: assignment.name,
    description: assignment.description,
    maxScore: assignmentMaxScore,
    selectedModelId: assignment.selectedModelId ?? null,
    problems: problemResponses,
    createdAt: assignment.createdAt.toISOString(),
  };
}

// ─── GET /api/assignments/[id] ─────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await buildAssignmentResponse(params.id);
    if (!response) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }
    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/assignments/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 }
    );
  }
}

// ─── PATCH /api/assignments/[id] ───────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = await parseBody(request, updateAssignmentSchema);
    if (parsed.error) return parsed.error;

    const existing = db
      .select({
        id: schema.assignments.id,
        selectedModelId: schema.assignments.selectedModelId,
      })
      .from(schema.assignments)
      .where(eq(schema.assignments.id, params.id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    // Only update fields the caller actually sent.
    const updates: Partial<typeof schema.assignments.$inferInsert> = {
      updatedAt: new Date(),
    };
    let nextSelectedModelId = existing.selectedModelId ?? null;
    if (Object.prototype.hasOwnProperty.call(parsed.data, "selectedModelId")) {
      nextSelectedModelId = parsed.data.selectedModelId ?? null;
      updates.selectedModelId = nextSelectedModelId;
    }

    db.update(schema.assignments)
      .set(updates)
      .where(eq(schema.assignments.id, params.id))
      .run();

    const response: UpdateAssignmentResponse = {
      id: params.id,
      selectedModelId: nextSelectedModelId,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("PATCH /api/assignments/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 }
    );
  }
}

// ─── DELETE /api/assignments/[id] ──────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await db
      .select({ id: schema.assignments.id })
      .from(schema.assignments)
      .where(eq(schema.assignments.id, params.id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    await db
      .delete(schema.assignments)
      .where(eq(schema.assignments.id, params.id));

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/assignments/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 }
    );
  }
}
