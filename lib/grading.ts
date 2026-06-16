// ─── Grading entrypoint ─────────────────────────────────────────
//
// Historically this module owned both the stub and real-OpenAI
// implementations. The real graders now live in `lib/graders/` behind
// a pluggable dispatcher (stub / openai / anthropic). This file is kept
// as a thin re-export so existing imports continue to work.
//
// Both the OpenAI and Anthropic adapters are implemented in `lib/graders/`.
// Toggle: set USE_REAL_GRADING=true env var to enable the real providers.
// ─────────────────────────────────────────────────────────────────

export { gradeProblem } from "./graders";
