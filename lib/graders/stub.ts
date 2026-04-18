// Stub grader — deterministic, no external calls. Used when no real API key
// is configured or when tests want reproducible output. Emits a mix of
// earned/not-earned + needsReview flags so downstream UI is exercised.

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
  GradePromptCriterionResult,
} from "../../contracts/types";

export async function gradeWithStub(
  input: GradeProblemPromptInput,
): Promise<GradeProblemPromptOutput> {
  const scores: GradePromptCriterionResult[] = input.criteria.map(
    (criterion, index) => {
      // Deterministic: earn even-indexed criteria, miss odd-indexed.
      const earned = index % 2 === 0;
      // Flag every third criterion so the yellow UI state is exercised
      // in dev without producing a wall of yellow.
      const needsReview = index % 3 === 2;
      return {
        criterionId: criterion.criterionId,
        earned,
        needsReview,
        feedback: needsReview
          ? `[STUB] Uncertain whether the submission addresses: ${criterion.description}. Flagged for TA review.`
          : earned
            ? `[STUB] Student demonstrates understanding of: ${criterion.description}`
            : `[STUB] Student did not adequately address: ${criterion.description}`,
      };
    },
  );

  return { scores };
}
