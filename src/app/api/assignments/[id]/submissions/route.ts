import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "../../../../../../db";
import * as schema from "../../../../../../db/schema";
import { computeEffectiveScore } from "../../../../../../lib/scores";
import type {
  SubmissionListItem,
  ProblemScoreSummary,
  ApiError,
} from "../../../../../../contracts/types";

// GET /api/assignments/[id]/submissions — list submissions for an assignment
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assignmentId = params.id;

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

    // Get all problems and their criteria for this assignment
    const problemRows = db
      .select({
        problemId: schema.problems.id,
        problemName: schema.problems.name,
        criterionId: schema.rubricCriteria.id,
        criterionPoints: schema.rubricCriteria.points,
      })
      .from(schema.problems)
      .leftJoin(
        schema.rubricCriteria,
        eq(schema.rubricCriteria.problemId, schema.problems.id)
      )
      .where(eq(schema.problems.assignmentId, assignmentId))
      .all();

    // Build problem info map: problemId -> { problemName, criteria: [{criterionId, points}] }
    const problemInfoMap = new Map<
      string,
      {
        problemName: string;
        criteria: { criterionId: string; points: number }[];
        maxScore: number;
      }
    >();
    for (const row of problemRows) {
      const existing = problemInfoMap.get(row.problemId);
      if (existing) {
        if (row.criterionId) {
          existing.criteria.push({
            criterionId: row.criterionId,
            points: row.criterionPoints ?? 0,
          });
          existing.maxScore += row.criterionPoints ?? 0;
        }
      } else {
        const criteria =
          row.criterionId
            ? [{ criterionId: row.criterionId, points: row.criterionPoints ?? 0 }]
            : [];
        problemInfoMap.set(row.problemId, {
          problemName: row.problemName,
          criteria,
          maxScore: row.criterionPoints ?? 0,
        });
      }
    }

    // Compute total maxScore
    let totalMaxScore = 0;
    for (const info of problemInfoMap.values()) {
      totalMaxScore += info.maxScore;
    }

    // Get all submissions ordered by studentIdentifier
    const subs = db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.assignmentId, assignmentId))
      .orderBy(asc(schema.submissions.studentIdentifier))
      .all();

    const results: SubmissionListItem[] = [];

    for (const sub of subs) {
      const isGraded = sub.status === "graded" || sub.status === "reviewed";

      // For graded submissions, get criterion scores
      const criterionScoreMap = new Map<
        string,
        { earned: boolean; overrideScore: number | null }
      >();

      if (isGraded) {
        const gradingResult = db
          .select()
          .from(schema.gradingResults)
          .where(eq(schema.gradingResults.submissionId, sub.id))
          .get();

        if (gradingResult) {
          const scores = db
            .select({
              criterionId: schema.criterionScores.criterionId,
              earned: schema.criterionScores.earned,
              overrideScore: schema.criterionScores.overrideScore,
            })
            .from(schema.criterionScores)
            .where(
              eq(schema.criterionScores.gradingResultId, gradingResult.id)
            )
            .all();

          for (const s of scores) {
            criterionScoreMap.set(s.criterionId, {
              earned: s.earned,
              overrideScore: s.overrideScore,
            });
          }
        }
      }

      // Build problemScores
      const problemScores: ProblemScoreSummary[] = [];
      let totalScore = 0;

      for (const [problemId, info] of problemInfoMap) {
        let problemScore = 0;

        if (isGraded) {
          for (const criterion of info.criteria) {
            const scoreData = criterionScoreMap.get(criterion.criterionId);
            if (scoreData) {
              problemScore += computeEffectiveScore(
                scoreData.earned,
                criterion.points,
                scoreData.overrideScore
              );
            }
          }
        }

        problemScores.push({
          problemId,
          problemName: info.problemName,
          score: problemScore,
          maxScore: info.maxScore,
        });
        totalScore += problemScore;
      }

      results.push({
        id: sub.id,
        studentIdentifier: sub.studentIdentifier,
        fileName: sub.fileName,
        status: sub.status as SubmissionListItem["status"],
        totalScore: isGraded ? totalScore : null,
        maxScore: totalMaxScore,
        problemScores,
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/assignments/[id]/submissions error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      } satisfies ApiError,
      { status: 500 }
    );
  }
}
