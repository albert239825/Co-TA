import { NextResponse } from "next/server";
import { MODELS, DEFAULT_MODEL_ID } from "../../../../contracts/models";
import type { ListModelsResponse } from "../../../../contracts/types";

// ─── GET /api/models ───────────────────────────────────────────
// Returns the locked list of supported LLMs plus the default fallback.
// The model-picker popover on an assignment reads this to render choices.
export function GET() {
  const response: ListModelsResponse = {
    models: [...MODELS],
    defaultModelId: DEFAULT_MODEL_ID,
  };
  return NextResponse.json(response);
}
