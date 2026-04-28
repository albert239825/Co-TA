// OpenAI grader. Uses the Chat Completions API in JSON mode. The caller
// picks the exact model id (e.g. "gpt-5.3", "gpt-5-mini") — this module
// does not decide which model to use.

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
} from "../../contracts/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

export async function gradeWithOpenAI(
  input: GradeProblemPromptInput,
  modelId: string,
): Promise<GradeProblemPromptOutput> {
  // Dynamic import so the package isn't loaded when using the stub path.
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const response = await client.chat.completions.create({
    model: modelId,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],

  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  const parsed = JSON.parse(content) as GradeProblemPromptOutput;
  validateFullCoverage(parsed, input);
  return parsed;
}

function validateFullCoverage(
  parsed: GradeProblemPromptOutput,
  input: GradeProblemPromptInput,
): void {
  const resultIds = new Set(parsed.scores.map((s) => s.criterionId));
  for (const criterion of input.criteria) {
    if (!resultIds.has(criterion.criterionId)) {
      throw new Error(
        `OpenAI response missing criterion: ${criterion.criterionId}`,
      );
    }
  }
}
