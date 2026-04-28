import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import * as schema from "../../../../db/schema";
import { uploadSubmissionsSchema, parseBody } from "../../../../lib/validation";
import type {
  SubmissionListItem,
  ProblemScoreSummary,
  ApiError,
} from "../../../../contracts/types";

// POST /api/submissions — batch upload submissions
export async function POST(request: Request) {
  try {
    const parsed = await parseBody(request, uploadSubmissionsSchema);
    if (parsed.error) return parsed.error;

    const { assignmentId, files } = parsed.data;

    // Verify assignment exists
    const assignment = db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .get();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    // Query problems and their criteria to build problemScores with maxScore
    const problemsWithCriteria = db
      .select({
        problemId: schema.problems.id,
        problemName: schema.problems.name,
        criterionPoints: schema.rubricCriteria.points,
      })
      .from(schema.problems)
      .leftJoin(
        schema.rubricCriteria,
        eq(schema.rubricCriteria.problemId, schema.problems.id)
      )
      .where(eq(schema.problems.assignmentId, assignmentId))
      .all();

    // Aggregate maxScore per problem
    const problemMap = new Map<
      string,
      { problemName: string; maxScore: number }
    >();
    for (const row of problemsWithCriteria) {
      const existing = problemMap.get(row.problemId);
      if (existing) {
        existing.maxScore += row.criterionPoints ?? 0;
      } else {
        problemMap.set(row.problemId, {
          problemName: row.problemName,
          maxScore: row.criterionPoints ?? 0,
        });
      }
    }

    const problemScores: ProblemScoreSummary[] = [];
    let totalMaxScore = 0;
    for (const [problemId, info] of Array.from(problemMap.entries())) {
      problemScores.push({
        problemId,
        problemName: info.problemName,
        score: 0,
        maxScore: info.maxScore,
      });
      totalMaxScore += info.maxScore;
    }

    // Batch insert submissions
    const results: SubmissionListItem[] = [];
    for (const file of files) {
      const id = crypto.randomUUID();
      db.insert(schema.submissions)
        .values({
          id,
          assignmentId,
          studentIdentifier: file.studentIdentifier,
          fileName: file.fileName,
          fileContent: file.fileContent,
          status: "pending",
        })
        .run();

      results.push({
        id,
        studentIdentifier: file.studentIdentifier,
        fileName: file.fileName,
        status: "pending",
        totalScore: null,
        maxScore: totalMaxScore,
        problemScores,
        needsReviewCount: 0,
      });
    }

    return NextResponse.json(results, { status: 201 });
  } catch (err) {
    console.error("POST /api/submissions error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      } satisfies ApiError,
      { status: 500 }
    );
  }
}
