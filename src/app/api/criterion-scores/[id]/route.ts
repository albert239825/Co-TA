import { eq } from "drizzle-orm";
import { db } from "../../../../../db";
import * as schema from "../../../../../db/schema";
import { updateCriterionScoreSchema, parseBody } from "../../../../../lib/validation";
import { computeEffectiveScore } from "../../../../../lib/scores";
import type { UpdateCriterionScoreResponse, ApiError } from "../../../../../contracts/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // Validate request body
    const parsed = await parseBody(request, updateCriterionScoreSchema);
    if (parsed.error) return parsed.error;

    const { overrideScore, taComment } = parsed.data;

    // Look up the criterion_score row
    const criterionScore = db
      .select()
      .from(schema.criterionScores)
      .where(eq(schema.criterionScores.id, id))
      .get();

    if (!criterionScore) {
      return Response.json(
        { error: "Criterion score not found" } satisfies ApiError,
        { status: 404 },
      );
    }

    // Update the criterion_score row
    db.update(schema.criterionScores)
      .set({
        overrideScore,
        taComment: taComment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.criterionScores.id, id))
      .run();

    // Recompute submission total score
    // 1. Get the grading result to find the submissionId
    const gradingResult = db
      .select()
      .from(schema.gradingResults)
      .where(eq(schema.gradingResults.id, criterionScore.gradingResultId))
      .get();

    if (!gradingResult) {
      return Response.json(
        { error: "Grading result not found" } satisfies ApiError,
        { status: 404 },
      );
    }

    // 2. Get ALL criterion_scores for this grading result, joined with rubric_criteria
    const allScores = db
      .select({
        csId: schema.criterionScores.id,
        earned: schema.criterionScores.earned,
        overrideScore: schema.criterionScores.overrideScore,
        points: schema.rubricCriteria.points,
      })
      .from(schema.criterionScores)
      .innerJoin(
        schema.rubricCriteria,
        eq(schema.criterionScores.criterionId, schema.rubricCriteria.id),
      )
      .where(eq(schema.criterionScores.gradingResultId, criterionScore.gradingResultId))
      .all();

    // 3. Compute effective scores and total
    let newTotalScore = 0;
    let effectiveScore = 0;

    for (const row of allScores) {
      const effective = computeEffectiveScore(
        row.earned,
        row.points,
        row.csId === id ? overrideScore : row.overrideScore,
      );
      newTotalScore += effective;
      if (row.csId === id) {
        effectiveScore = effective;
      }
    }

    const response: UpdateCriterionScoreResponse = {
      criterionScoreId: id,
      effectiveScore,
      newTotalScore,
    };

    return Response.json(response);
  } catch (error) {
    console.error("PATCH /api/criterion-scores/[id] error:", error);
    return Response.json(
      { error: "Internal server error" } satisfies ApiError,
      { status: 500 },
    );
  }
}
