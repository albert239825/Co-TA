// ─── Grading function ───────────────────────────────────────────
//
// This module provides the grading function that processes a single
// (submission, problem) pair. It ships with a stub implementation
// that returns deterministic mock results in the correct
// GradeProblemPromptOutput shape. The real OpenAI path will be
// toggled in when prompts/grade.ts lands from the orchestrator.
//
// Toggle: set USE_REAL_GRADING=true env var to use OpenAI.
// ─────────────────────────────────────────────────────────────────

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
  GradePromptCriterionResult,
} from "../contracts/types";

const USE_REAL_GRADING = process.env.USE_REAL_GRADING === "true";

/**
 * Grade a single problem for a submission.
 * Returns scores for each criterion in the problem.
 */
export async function gradeProblem(
  input: GradeProblemPromptInput
): Promise<GradeProblemPromptOutput> {
  if (USE_REAL_GRADING) {
    return gradeProblemWithOpenAI(input);
  }
  return gradeProblemStub(input);
}

/**
 * Stub implementation: returns deterministic mock results.
 * Each criterion gets earned=true with a simple hash-based rule
 * so results are reproducible but not all-pass.
 */
function gradeProblemStub(
  input: GradeProblemPromptInput
): GradeProblemPromptOutput {
  const scores: GradePromptCriterionResult[] = input.criteria.map(
    (criterion, index) => {
      // Deterministic: earn odd-indexed criteria, skip even ones.
      // This gives a mix of earned/not-earned for realistic testing.
      const earned = index % 2 === 0;
      // Flag every third criterion as needing review so the UI state
      // is exercised in stub mode without producing a wall of yellow.
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
    }
  );

  return { scores };
}

/**
 * Real OpenAI implementation — placeholder for when prompts/grade.ts lands.
 * Will use GPT-4o in JSON mode to grade the submission against the rubric.
 */
async function gradeProblemWithOpenAI(
  input: GradeProblemPromptInput
): Promise<GradeProblemPromptOutput> {
  // Dynamic import to avoid loading OpenAI when using stub
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const systemPrompt = `You are a teaching assistant grading a student submission.
Grade the following problem against the provided rubric criteria.

For each criterion, return:
- "earned": true if the student clearly earned the points, false otherwise.
- "needsReview": true if you are NOT confident in your decision and the criterion should be flagged for human review (ambiguous evidence, partial answer, unclear reasoning, off-topic but adjacent, etc). Otherwise false.
- "feedback": specific, concrete feedback about the student's work on this criterion.

Prefer "needsReview": true over guessing. When "needsReview" is true, the system will treat the criterion as not-earned by default and surface it to the TA for manual review; the TA can then override.

Return JSON matching this exact schema:
{
  "scores": [
    {
      "criterionId": "<the criterion ID>",
      "earned": true/false,
      "needsReview": true/false,
      "feedback": "<specific feedback about the student's work>"
    }
  ]
}`;

  const userPrompt = `## Assignment
${input.assignmentDescription}

## Problem: ${input.problemName}
${input.problemDescription}

## Rubric Criteria
${input.criteria.map((c) => `- [${c.criterionId}] ${c.description} (${c.points} points)`).join("\n")}

## Student Submission
${input.submissionText}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  const parsed = JSON.parse(content) as GradeProblemPromptOutput;

  // Validate that we got results for all criteria
  const resultIds = new Set(parsed.scores.map((s) => s.criterionId));
  for (const criterion of input.criteria) {
    if (!resultIds.has(criterion.criterionId)) {
      throw new Error(
        `OpenAI response missing criterion: ${criterion.criterionId}`
      );
    }
  }

  return parsed;
}
