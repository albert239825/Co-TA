// Shared types for the pluggable grader framework. Each provider module
// exports a function that takes a GradeProblemPromptInput plus a model id
// and returns a GradeProblemPromptOutput. The dispatcher in `lib/graders/
// index.ts` picks a provider based on the model's registered provider.

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
} from "../../contracts/types";

export type GradeFn = (
  input: GradeProblemPromptInput,
  modelId: string,
) => Promise<GradeProblemPromptOutput>;
