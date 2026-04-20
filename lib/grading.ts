// ─── Grading function ───────────────────────────────────────────
//
// This module provides the grading function that processes a single
// (submission, problem) pair. It ships with a stub implementation
// that returns deterministic mock results in the correct
// GradeProblemPromptOutput shape. When USE_REAL_GRADING=true, the
// model's provider field routes to the correct API client (OpenAI
// implemented; Anthropic adapter coming in Feature C child PR).
//
// Toggle: set USE_REAL_GRADING=true env var to use real LLM APIs.
// ─────────────────────────────────────────────────────────────────

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
  GradePromptCriterionResult,
} from "../contracts/types";
import { DEFAULT_MODEL_ID, getModelById } from "../contracts/models";

const USE_REAL_GRADING = process.env.USE_REAL_GRADING === "true";

/**
 * Grade a single problem for a submission.
 * Returns scores for each criterion in the problem.
 *
 * @param modelId – optional model id override. Falls back to DEFAULT_MODEL_ID
 *   when omitted. The stub ignores it; the real path routes to the correct
 *   provider based on the model registry.
 */
export async function gradeProblem(
  input: GradeProblemPromptInput,
  modelId: string = DEFAULT_MODEL_ID
): Promise<GradeProblemPromptOutput> {
  if (USE_REAL_GRADING) {
    const model = getModelById(modelId);
    const provider = model?.provider ?? "openai";

    switch (provider) {
      case "openai":
        return gradeProblemWithOpenAI(input, modelId);
      case "anthropic":
        // TODO: implement Anthropic adapter in Feature C child PR
        throw new Error(
          `Anthropic provider not yet implemented. Model "${modelId}" cannot be used for grading until the Anthropic adapter is added.`
        );
      default:
        throw new Error(`Unknown provider "${provider}" for model "${modelId}"`);
    }
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
      // Deterministic: earn odd-indexed criteria, skip even ones
      // This gives a mix of earned/not-earned for realistic testing
      const earned = index % 2 === 0;
      return {
        criterionId: criterion.criterionId,
        earned,
        feedback: earned
          ? `[STUB] Student demonstrates understanding of: ${criterion.description}`
          : `[STUB] Student did not adequately address: ${criterion.description}`,
      };
    }
  );

  return { scores };
}

/**
 * Real OpenAI implementation — placeholder for when prompts/grade.ts lands.
 * Uses the caller-supplied model id so the pluggable-model fallback chain is
 * respected end-to-end.
 */
async function gradeProblemWithOpenAI(
  input: GradeProblemPromptInput,
  modelId: string
): Promise<GradeProblemPromptOutput> {
  // Dynamic import to avoid loading OpenAI when using stub
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const systemPrompt = `You are a teaching assistant grading a student submission.
Grade the following problem against the provided rubric criteria.
For each criterion, determine if the student earned the points (true/false) and provide specific feedback.
Return JSON matching this exact schema:
{
  "scores": [
    {
      "criterionId": "<the criterion ID>",
      "earned": true/false,
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
    model: modelId,
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
