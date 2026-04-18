import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import * as schema from "../../../../db/schema";
import { createAssignmentSchema, parseBody } from "../../../../lib/validation";
import type {
  AssignmentResponse,
  ProblemResponse,
  CriterionResponse,
  ApiError,
} from "../../../../contracts/types";

// ─── POST /api/assignments ─────────────────────────────────────
export async function POST(request: Request) {
  try {
    const parsed = await parseBody(request, createAssignmentSchema);
    if (parsed.error) return parsed.error;

    const { name, description, problems, selectedModelId } = parsed.data;

    const assignmentId = crypto.randomUUID();
    let totalMaxScore = 0;

    const problemResponses: ProblemResponse[] = [];

    db.transaction((tx) => {
      tx.insert(schema.assignments).values({
        id: assignmentId,
        name,
        description,
        selectedModelId: selectedModelId ?? null,
      }).run();

      for (const prob of problems) {
        const problemId = crypto.randomUUID();
        tx.insert(schema.problems).values({
          id: problemId,
          assignmentId,
          name: prob.name,
          description: prob.description,
          sortOrder: prob.sortOrder,
        }).run();

        const criteriaResponses: CriterionResponse[] = [];
        let problemMaxScore = 0;

        for (const crit of prob.criteria) {
          const criterionId = crypto.randomUUID();
          tx.insert(schema.rubricCriteria).values({
            id: criterionId,
            problemId,
            description: crit.description,
            points: crit.points,
            sortOrder: crit.sortOrder,
          }).run();

          problemMaxScore += crit.points;
          criteriaResponses.push({
            id: criterionId,
            description: crit.description,
            points: crit.points,
            sortOrder: crit.sortOrder,
          });
        }

        totalMaxScore += problemMaxScore;
        problemResponses.push({
          id: problemId,
          name: prob.name,
          description: prob.description,
          sortOrder: prob.sortOrder,
          maxScore: problemMaxScore,
          criteria: criteriaResponses,
        });
      }
    });

    // Fetch the created assignment to get the createdAt timestamp
    const created = await db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .get();

    const response: AssignmentResponse = {
      id: assignmentId,
      name,
      description,
      maxScore: totalMaxScore,
      selectedModelId: selectedModelId ?? null,
      problems: problemResponses,
      createdAt: created!.createdAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("POST /api/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 }
    );
  }
}

// ─── GET /api/assignments ──────────────────────────────────────
export async function GET() {
  try {
    const allAssignments = await db
      .select()
      .from(schema.assignments)
      .all();

    const responses: AssignmentResponse[] = [];

    for (const assignment of allAssignments) {
      const probs = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.assignmentId, assignment.id))
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

      responses.push({
        id: assignment.id,
        name: assignment.name,
        description: assignment.description,
        maxScore: assignmentMaxScore,
        selectedModelId: assignment.selectedModelId ?? null,
        problems: problemResponses,
        createdAt: assignment.createdAt.toISOString(),
      });
    }

    return NextResponse.json(responses);
  } catch (err) {
    console.error("GET /api/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 }
    );
  }
}
