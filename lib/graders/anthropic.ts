// Anthropic grader. Uses the Messages API and asks the model to return
// JSON that we parse ourselves (Anthropic doesn't expose an OpenAI-style
// json_object response format, so we rely on the prompt).
//
// Requires the `@anthropic-ai/sdk` package and an ANTHROPIC_API_KEY env var.

import type {
  GradeProblemPromptInput,
  GradeProblemPromptOutput,
} from "../../contracts/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

export async function gradeWithAnthropic(
  input: GradeProblemPromptInput,
  modelId: string,
): Promise<GradeProblemPromptOutput> {
  // Dynamic import so the package isn't loaded when using the stub or
  // OpenAI paths.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
    temperature: 0.2,
  });

  // Anthropic returns a list of content blocks. Concatenate all text
  // blocks before parsing JSON.
  const text = response.content
    .filter((block): block is Extract<typeof block, { type: "text" }> =>
      block.type === "text",
    )
    .map((block) => block.text)
    .join("");

  if (!text) {
    throw new Error("Anthropic returned empty response");
  }

  // Models sometimes wrap JSON in ```json fences; strip them if present.
  const cleaned = stripJsonFence(text);

  let parsed: GradeProblemPromptOutput;
  try {
    parsed = JSON.parse(cleaned) as GradeProblemPromptOutput;
  } catch (err) {
    throw new Error(
      `Anthropic returned non-JSON response: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  validateFullCoverage(parsed, input);
  return parsed;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const match = trimmed.match(fence);
  return match ? match[1] : trimmed;
}

function validateFullCoverage(
  parsed: GradeProblemPromptOutput,
  input: GradeProblemPromptInput,
): void {
  const resultIds = new Set(parsed.scores.map((s) => s.criterionId));
  for (const criterion of input.criteria) {
    if (!resultIds.has(criterion.criterionId)) {
      throw new Error(
        `Anthropic response missing criterion: ${criterion.criterionId}`,
      );
    }
  }
}
