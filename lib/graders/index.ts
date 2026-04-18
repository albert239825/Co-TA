// Pluggable grader dispatcher. The caller passes a modelId (from the
// registry in contracts/models.ts); we look up the provider and call the
// matching adapter.
//
// Precedence rules enforced by the caller:
//   1. explicit request modelId (from BatchGradeRequest.modelId)
//   2. assignment.selectedModelId
//   3. DEFAULT_MODEL_ID from contracts/models
//
// This module only cares about (1) — it validates the resolved id and
// dispatches to the correct provider. If USE_REAL_GRADING is not "true",
// we always use the stub regardless of the requested modelId (handy for
// local dev and tests so we don't need real keys).

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
} from "../../contracts/types";
import { getModelById, DEFAULT_MODEL_ID } from "../../contracts/models";
import { gradeWithStub } from "./stub";
import { gradeWithOpenAI } from "./openai";
import { gradeWithAnthropic } from "./anthropic";

const USE_REAL_GRADING = process.env.USE_REAL_GRADING === "true";

/**
 * Grade a single problem for a submission with the specified model.
 * Returns scores for each criterion.
 *
 * When the supplied modelId is unknown we fall back to DEFAULT_MODEL_ID
 * rather than throwing — callers should still validate input via the zod
 * schema, but we don't want a stale id in the DB to break grading.
 */
export async function gradeProblem(
  input: GradeProblemPromptInput,
  modelId?: string | null,
): Promise<GradeProblemPromptOutput> {
  const resolvedId = modelId ?? DEFAULT_MODEL_ID;

  if (!USE_REAL_GRADING) {
    return gradeWithStub(input);
  }

  const model = getModelById(resolvedId) ?? getModelById(DEFAULT_MODEL_ID);
  if (!model) {
    // DEFAULT_MODEL_ID is also missing from the registry — misconfiguration.
    // Fall back to the stub so grading still completes.
    return gradeWithStub(input);
  }

  switch (model.provider) {
    case "openai":
      return gradeWithOpenAI(input, model.id);
    case "anthropic":
      return gradeWithAnthropic(input, model.id);
    case "stub":
      return gradeWithStub(input);
    default: {
      // Unknown provider — shouldn't happen given the registry is a union,
      // but keep a runtime guard.
      const _exhaustive: never = model.provider;
      void _exhaustive;
      return gradeWithStub(input);
    }
  }
}
