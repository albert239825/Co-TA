// ─── Model registry ─────────────────────────────────────────
//
// Single source of truth for which LLMs Co-TA supports. The
// grader framework (`lib/graders/`) picks a provider adapter
// based on the `provider` field. The UI's model-picker popover
// renders `displayName` / `description`.
//
// Agents: READ this file. Do NOT modify it without approval —
// adding/removing a model has product + cost implications.
// ─────────────────────────────────────────────────────────────

import type { ModelInfo } from "./types";

export const MODELS: readonly ModelInfo[] = [
  {
    id: "gpt-5.3",
    provider: "openai",
    displayName: "GPT-5.3",
    description: "OpenAI flagship. Best quality, highest cost.",
  },
  {
    id: "gpt-5-mini",
    provider: "openai",
    displayName: "GPT-5 mini",
    description: "Fast, cheap OpenAI model. Good for bulk grading.",
  },
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    displayName: "Claude Opus 4.7",
    description: "Anthropic flagship. Deepest reasoning.",
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.6",
    description: "Balanced quality + cost. Recommended default.",
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    description: "Fastest, cheapest Anthropic model.",
  },
] as const;

/** The model id used when an assignment has no explicit selection. */
export const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

/** Set of valid model ids — used by zod validation. */
export const MODEL_IDS: readonly string[] = MODELS.map((m) => m.id);

/** Look up a model by id. Returns null if the id is unknown. */
export function getModelById(id: string): ModelInfo | null {
  return MODELS.find((m) => m.id === id) ?? null;
}
