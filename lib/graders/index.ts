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
 * When the supplied modelId is unknown we throw an explicit error rather
 * than silently falling back — callers (e.g. the batch route) are expected
 * to validate the id against the registry before calling, so an unknown id
 * here means we have a real bug or stale data we'd rather surface loudly.
 */
export async function gradeProblem(
  input: GradeProblemPromptInput,
  modelId?: string | null,
): Promise<GradeProblemPromptOutput> {
  const resolvedId = modelId ?? DEFAULT_MODEL_ID;

  if (!USE_REAL_GRADING) {
    return gradeWithStub(input);
  }

  const model = getModelById(resolvedId);
  if (!model) {
    throw new Error(
      `Unknown model "${resolvedId}" — not present in the model registry. ` +
        `It may have been removed from contracts/models.ts.`,
    );
  }

  switch (model.provider) {
    case "openai":
      return gradeWithOpenAI(input, model.id);
    case "anthropic":
      return gradeWithAnthropic(input, model.id);
    case "stub":
      return gradeWithStub(input);
    default: {
      const _exhaustive: never = model.provider;
      void _exhaustive;
      throw new Error(
        `Unknown provider "${model.provider}" for model "${model.id}"`,
      );
    }
  }
}
