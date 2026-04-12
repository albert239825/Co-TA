// ─── Pure score computation functions ───────────────────────────
//
// These implement the formulas from ARCHITECTURE.md § "Computed scores".
// Scores are never stored — always computed on read.
//
// criterion effective = overrideScore ?? (earned ? criterion.points : 0)
// problem score       = SUM(effective) for criteria in that problem
// problem max         = SUM(criterion.points) for criteria in that problem
// total score         = SUM(problem scores)
// total max           = SUM(problem maxes)
// ────────────────────────────────────────────────────────────────

export interface CriterionScoreInput {
  earned: boolean;
  points: number;
  overrideScore: number | null;
}

export interface ProblemScoreInput {
  criteria: CriterionScoreInput[];
}

/**
 * Compute the effective score for a single criterion.
 * If a TA override exists, use it; otherwise use earned ? points : 0.
 */
export function computeEffectiveScore(
  earned: boolean,
  points: number,
  overrideScore: number | null
): number {
  if (overrideScore !== null && overrideScore !== undefined) {
    return overrideScore;
  }
  return earned ? points : 0;
}

/**
 * Compute the score and maxScore for a single problem.
 */
export function computeProblemScore(criteria: CriterionScoreInput[]): {
  score: number;
  maxScore: number;
} {
  let score = 0;
  let maxScore = 0;
  for (const c of criteria) {
    score += computeEffectiveScore(c.earned, c.points, c.overrideScore);
    maxScore += c.points;
  }
  return { score, maxScore };
}

/**
 * Compute the total score and maxScore across all problems.
 */
export function computeSubmissionTotal(
  problems: ProblemScoreInput[]
): { totalScore: number; maxScore: number } {
  let totalScore = 0;
  let maxScore = 0;
  for (const p of problems) {
    const result = computeProblemScore(p.criteria);
    totalScore += result.score;
    maxScore += result.maxScore;
  }
  return { totalScore, maxScore };
}

/**
 * Compute maxScore for an assignment from its rubric criteria points.
 * Used when returning AssignmentResponse.
 */
export function computeAssignmentMaxScore(
  criteriaPoints: number[]
): number {
  return criteriaPoints.reduce((sum, p) => sum + p, 0);
}
