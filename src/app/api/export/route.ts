import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../db";
import * as schema from "../../../../db/schema";
import { exportQuerySchema, parseQuery } from "../../../../lib/validation";
import { computeEffectiveScore } from "../../../../lib/scores";
import type { ApiError } from "../../../../contracts/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams, exportQuerySchema);
    if (parsed.error) return parsed.error;

    const { assignmentId } = parsed.data;

    // Verify assignment exists
    const assignment = db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .get();

    if (!assignment) {
      return Response.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 },
      );
    }

    // Get submissions with status "graded" or "reviewed"
    const subs = db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.assignmentId, assignmentId))
      .all()
      .filter((s) => s.status === "graded" || s.status === "reviewed");

    // Get problems ordered by sortOrder for CSV header columns
    const problemsList = db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.assignmentId, assignmentId))
      .orderBy(schema.problems.sortOrder)
      .all();

    // Get all rubric criteria for the assignment's problems
    const problemIds = problemsList.map((p) => p.id);
    const allCriteria =
      problemIds.length > 0
        ? db
            .select()
            .from(schema.rubricCriteria)
            .where(inArray(schema.rubricCriteria.problemId, problemIds))
            .all()
        : [];

    // Build a map: problemId -> criteria[]
    const criteriaByProblem = new Map<string, (typeof allCriteria)[number][]>();
    for (const c of allCriteria) {
      const list = criteriaByProblem.get(c.problemId) ?? [];
      list.push(c);
      criteriaByProblem.set(c.problemId, list);
    }

    // Build CSV rows
    const rows: string[][] = [];

    // Header row
    const header = [
      "studentIdentifier",
      ...problemsList.map((p) => p.name),
      "totalScore",
      "feedback",
    ];
    rows.push(header);

    // For each submission, compute problem scores and feedback
    for (const sub of subs) {
      // Get grading result for this submission
      const gradingResult = db
        .select()
        .from(schema.gradingResults)
        .where(eq(schema.gradingResults.submissionId, sub.id))
        .get();

      const problemScores: number[] = [];
      let totalScore = 0;
      const feedbackParts: string[] = [];

      for (const problem of problemsList) {
        const criteria = criteriaByProblem.get(problem.id) ?? [];
        let problemScore = 0;

        if (gradingResult) {
          // Get criterion scores for this grading result and problem's criteria
          const criterionIds = criteria.map((c) => c.id);
          const scores =
            criterionIds.length > 0
              ? db
                  .select()
                  .from(schema.criterionScores)
                  .where(eq(schema.criterionScores.gradingResultId, gradingResult.id))
                  .all()
                  .filter((cs) => criterionIds.includes(cs.criterionId))
              : [];

          // Build a map criterionId -> criterionScore for quick lookup
          const scoreMap = new Map(scores.map((s) => [s.criterionId, s]));

          for (const criterion of criteria) {
            const cs = scoreMap.get(criterion.id);
            if (cs) {
              const effective = computeEffectiveScore(
                cs.earned,
                criterion.points,
                cs.overrideScore,
              );
              problemScore += effective;

              // Collect feedback
              if (cs.aiFeedback) {
                feedbackParts.push(cs.aiFeedback);
              }
              if (cs.taComment) {
                feedbackParts.push(cs.taComment);
              }
            }
          }
        }

        problemScores.push(problemScore);
        totalScore += problemScore;
      }

      const feedback = feedbackParts.join("; ");

      rows.push([
        sub.studentIdentifier,
        ...problemScores.map(String),
        String(totalScore),
        feedback,
      ]);
    }

    // Build CSV string with proper escaping
    const csvString = rows
      .map((row) =>
        row
          .map((cell) => {
            if (
              cell.includes(",") ||
              cell.includes('"') ||
              cell.includes("\n")
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(","),
      )
      .join("\n");

    return new Response(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${assignment.name}-grades.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return Response.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 },
    );
  }
}
