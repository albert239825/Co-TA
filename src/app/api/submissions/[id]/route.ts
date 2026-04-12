import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db";
import * as schema from "../../../../../db/schema";
import { computeEffectiveScore } from "../../../../../lib/scores";
import type {
  SubmissionDetailResponse,
  GradingResultResponse,
  ProblemGradeResponse,
  CriterionScoreResponse,
  ApiError,
} from "../../../../../contracts/types";

// GET /api/submissions/[id] — get submission detail
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const submissionId = params.id;

    const submission = db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, submissionId))
      .get();

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    // Get problems and criteria for this assignment
    const problemRows = db
      .select({
        problemId: schema.problems.id,
        problemName: schema.problems.name,
        problemDescription: schema.problems.description,
        criterionId: schema.rubricCriteria.id,
        criterionDescription: schema.rubricCriteria.description,
        criterionPoints: schema.rubricCriteria.points,
      })
      .from(schema.problems)
      .leftJoin(
        schema.rubricCriteria,
        eq(schema.rubricCriteria.problemId, schema.problems.id)
      )
      .where(eq(schema.problems.assignmentId, submission.assignmentId))
      .all();

    // Build problem info map
    const problemInfoMap = new Map<
      string,
      {
        problemName: string;
        problemDescription: string;
        criteria: {
          criterionId: string;
          description: string;
          points: number;
        }[];
        maxScore: number;
      }
    >();

    for (const row of problemRows) {
      const existing = problemInfoMap.get(row.problemId);
      if (existing) {
        if (row.criterionId) {
          existing.criteria.push({
            criterionId: row.criterionId,
            description: row.criterionDescription ?? "",
            points: row.criterionPoints ?? 0,
          });
          existing.maxScore += row.criterionPoints ?? 0;
        }
      } else {
        const criteria = row.criterionId
          ? [
              {
                criterionId: row.criterionId,
                description: row.criterionDescription ?? "",
                points: row.criterionPoints ?? 0,
              },
            ]
          : [];
        problemInfoMap.set(row.problemId, {
          problemName: row.problemName,
          problemDescription: row.problemDescription,
          criteria,
          maxScore: row.criterionPoints ?? 0,
        });
      }
    }

    // Compute maxScore
    let maxScore = 0;
    for (const info of problemInfoMap.values()) {
      maxScore += info.maxScore;
    }

    // Check if graded
    const isGraded =
      submission.status === "graded" || submission.status === "reviewed";

    let gradingResult: GradingResultResponse | null = null;
    let totalScore = 0;

    if (isGraded) {
      const grResult = db
        .select()
        .from(schema.gradingResults)
        .where(eq(schema.gradingResults.submissionId, submissionId))
        .get();

      if (grResult) {
        // Get all criterion scores for this grading result
        const criterionScoresRows = db
          .select({
            criterionScoreId: schema.criterionScores.id,
            criterionId: schema.criterionScores.criterionId,
            earned: schema.criterionScores.earned,
            aiFeedback: schema.criterionScores.aiFeedback,
            overrideScore: schema.criterionScores.overrideScore,
            taComment: schema.criterionScores.taComment,
          })
          .from(schema.criterionScores)
          .where(eq(schema.criterionScores.gradingResultId, grResult.id))
          .all();

        // Map criterion scores by criterionId
        const scoreMap = new Map<
          string,
          {
            criterionScoreId: string;
            earned: boolean;
            aiFeedback: string;
            overrideScore: number | null;
            taComment: string | null;
          }
        >();
        for (const cs of criterionScoresRows) {
          scoreMap.set(cs.criterionId, {
            criterionScoreId: cs.criterionScoreId,
            earned: cs.earned,
            aiFeedback: cs.aiFeedback,
            overrideScore: cs.overrideScore,
            taComment: cs.taComment,
          });
        }

        // Build problems array for GradingResultResponse
        const problemGrades: ProblemGradeResponse[] = [];

        for (const [problemId, info] of problemInfoMap) {
          const criteriaResponses: CriterionScoreResponse[] = [];
          let problemScore = 0;

          for (const criterion of info.criteria) {
            const scoreData = scoreMap.get(criterion.criterionId);
            if (scoreData) {
              const effectiveScore = computeEffectiveScore(
                scoreData.earned,
                criterion.points,
                scoreData.overrideScore
              );
              criteriaResponses.push({
                criterionScoreId: scoreData.criterionScoreId,
                criterionId: criterion.criterionId,
                description: criterion.description,
                points: criterion.points,
                earned: scoreData.earned,
                aiFeedback: scoreData.aiFeedback,
                overrideScore: scoreData.overrideScore,
                taComment: scoreData.taComment,
                effectiveScore,
              });
              problemScore += effectiveScore;
            }
          }

          problemGrades.push({
            problemId,
            problemName: info.problemName,
            problemDescription: info.problemDescription,
            score: problemScore,
            maxScore: info.maxScore,
            criteria: criteriaResponses,
          });

          totalScore += problemScore;
        }

        gradingResult = {
          id: grResult.id,
          modelUsed: grResult.modelUsed,
          gradedAt: grResult.gradedAt
            ? grResult.gradedAt.toISOString()
            : new Date().toISOString(),
          problems: problemGrades,
        };
      }
    }

    const response: SubmissionDetailResponse = {
      id: submission.id,
      studentIdentifier: submission.studentIdentifier,
      fileName: submission.fileName,
      fileContent: submission.fileContent,
      status: submission.status as SubmissionDetailResponse["status"],
      totalScore,
      maxScore,
      gradingResult,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/submissions/[id] error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      } satisfies ApiError,
      { status: 500 }
    );
  }
}
