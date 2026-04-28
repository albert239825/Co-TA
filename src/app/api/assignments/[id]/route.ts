import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../../db";
import * as schema from "../../../../../db/schema";
import {
  updateAssignmentSchema,
  editAssignmentSchema,
  parseBody,
} from "../../../../../lib/validation";
import type {
  AssignmentResponse,
  ProblemResponse,
  CriterionResponse,
  ApiError,
  UpdateAssignmentResponse,
  EditAssignmentResponse,
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

// ─── PUT /api/assignments/[id] ─────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = await parseBody(request, editAssignmentSchema);
    if (parsed.error) return parsed.error;

    const { name, description, problems, selectedModelId, resetGrades } =
      parsed.data;

    const existing = await db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, params.id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    let submissionsReset = 0;

    db.transaction((tx) => {
      // 1. Update assignment row
      const assignmentUpdates: Partial<typeof schema.assignments.$inferInsert> = {
        name,
        description,
        updatedAt: new Date(),
      };
      if (Object.prototype.hasOwnProperty.call(parsed.data, "selectedModelId")) {
        assignmentUpdates.selectedModelId = selectedModelId ?? null;
      }
      tx.update(schema.assignments)
        .set(assignmentUpdates)
        .where(eq(schema.assignments.id, params.id))
        .run();

      // 2. Get existing problems for this assignment
      const existingProblems = tx
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.assignmentId, params.id))
        .all();

      const incomingProblemIds = new Set(
        problems.filter((p) => p.id).map((p) => p.id!)
      );

      // 3. Delete removed problems (cascade deletes criteria + scores)
      for (const ep of existingProblems) {
        if (!incomingProblemIds.has(ep.id)) {
          tx.delete(schema.problems)
            .where(eq(schema.problems.id, ep.id))
            .run();
        }
      }

      // 4. Upsert problems and their criteria
      for (const prob of problems) {
        let problemId: string;

        if (prob.id && existingProblems.some((ep) => ep.id === prob.id)) {
          // Update existing problem
          problemId = prob.id;
          tx.update(schema.problems)
            .set({
              name: prob.name,
              description: prob.description,
              sortOrder: prob.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(schema.problems.id, problemId))
            .run();
        } else {
          // Insert new problem
          problemId = crypto.randomUUID();
          tx.insert(schema.problems)
            .values({
              id: problemId,
              assignmentId: params.id,
              name: prob.name,
              description: prob.description,
              sortOrder: prob.sortOrder,
            })
            .run();
        }

        // Handle criteria for this problem
        const existingCriteria = tx
          .select()
          .from(schema.rubricCriteria)
          .where(eq(schema.rubricCriteria.problemId, problemId))
          .all();

        const incomingCriterionIds = new Set(
          prob.criteria.filter((c) => c.id).map((c) => c.id!)
        );

        // Delete removed criteria
        for (const ec of existingCriteria) {
          if (!incomingCriterionIds.has(ec.id)) {
            tx.delete(schema.rubricCriteria)
              .where(eq(schema.rubricCriteria.id, ec.id))
              .run();
          }
        }

        // Upsert criteria
        for (const crit of prob.criteria) {
          if (
            crit.id &&
            existingCriteria.some((ec) => ec.id === crit.id)
          ) {
            tx.update(schema.rubricCriteria)
              .set({
                description: crit.description,
                points: crit.points,
                sortOrder: crit.sortOrder,
                updatedAt: new Date(),
              })
              .where(eq(schema.rubricCriteria.id, crit.id))
              .run();
          } else {
            tx.insert(schema.rubricCriteria)
              .values({
                id: crypto.randomUUID(),
                problemId,
                description: crit.description,
                points: crit.points,
                sortOrder: crit.sortOrder,
              })
              .run();
          }
        }
      }

      // 5. Optionally reset graded submissions back to pending
      if (resetGrades) {
        const graded = tx
          .select({ id: schema.submissions.id })
          .from(schema.submissions)
          .where(eq(schema.submissions.assignmentId, params.id))
          .all()
          .filter((s) => {
            const sub = tx
              .select({ status: schema.submissions.status })
              .from(schema.submissions)
              .where(eq(schema.submissions.id, s.id))
              .get();
            return (
              sub?.status === "graded" || sub?.status === "reviewed"
            );
          });

        if (graded.length > 0) {
          const gradedIds = graded.map((s) => s.id);

          // Delete grading results (cascades to criterion_scores)
          const results = tx
            .select({ id: schema.gradingResults.id })
            .from(schema.gradingResults)
            .where(
              inArray(schema.gradingResults.submissionId, gradedIds)
            )
            .all();

          for (const r of results) {
            tx.delete(schema.gradingResults)
              .where(eq(schema.gradingResults.id, r.id))
              .run();
          }

          // Reset status to pending
          for (const id of gradedIds) {
            tx.update(schema.submissions)
              .set({ status: "pending", updatedAt: new Date() })
              .where(eq(schema.submissions.id, id))
              .run();
          }

          submissionsReset = gradedIds.length;
        }
      }
    });

    // Build and return the full response
    const response = await buildAssignmentResponse(params.id);
    if (!response) {
      return NextResponse.json(
        { error: "Assignment not found after update" } satisfies ApiError,
        { status: 500 }
      );
    }

    const editResponse: EditAssignmentResponse = {
      ...response,
      submissionsReset,
    };

    return NextResponse.json(editResponse);
  } catch (err) {
    console.error("PUT /api/assignments/[id] error:", err);
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
