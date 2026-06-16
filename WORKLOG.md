# Worklog

A running log of work sessions on Co-TA. Newest first.

## 2026-06-16 — Familiarization, run, and simulated-student suite

### Familiarization
- Walked the codebase: Next.js 14 App Router + SQLite/Drizzle + Zod, optional
  OpenAI/Anthropic grading behind `USE_REAL_GRADING` (deterministic stub
  otherwise). Data model `Assignment → Problems → RubricCriteria` and
  `Submission → GradingResult → CriterionScores`; scores computed on read.
- Grading pipeline: `POST /api/grade/batch` → background engine (inline
  concurrency limit 5) → per-problem LLM call via `lib/graders/` dispatcher →
  SSE progress through `lib/events.ts`.

### Doc fixes
- `CLAUDE.md` and `lib/grading.ts` claimed the Anthropic adapter "throws / is
  not yet implemented." It is in fact implemented (`lib/graders/anthropic.ts`).
  Corrected both notes.

### Ran the app
- `npm install` (compiled better-sqlite3), `npm run db:push`, `npm run dev`.
- Verified: home page `HTTP 200`, `/api/models` `HTTP 200`. Uses the stub
  grader (no API keys / `USE_REAL_GRADING` set).

### Built the simulated-student suite (`simulated-students/`)
Goal: synthetic students with known answer keys to test grading and **compare
rubrics against each other**. Case-study problem: *first non-repeating
character in a string* (optimal O(n)).

- `dimensions.ts` — 7 orthogonal quality dimensions (correctness, execution,
  efficiency, completeness, simplicity, readability, explanation), each on a
  `good > partial > bad` scale.
- `personas/` — the 5 original archetypes (Logic Master w/ Bad Syntax, Clean
  Coder w/ Wrong Logic, Brute Forcer, Off-by-One Victim, Over-Complicator)
  plus Perfect Student (ceiling) and Empty Submission (floor). Each carries a
  ground-truth level per dimension + the actual Python it "submitted."
- `rubrics/` — Output-Only, Correctness + Efficiency, Comprehensive. Each
  criterion is tagged with the dimension it measures + a `minLevel`, so the
  harness can compute expected vs. actual.
- `run.ts` — harness that grades every persona × rubric via the real
  `gradeProblem()` pipeline and prints an EXPECTED matrix, an ACTUAL matrix
  per model, and grader-accuracy-vs-ground-truth (`--details` for per-criterion
  mismatches). `load-env.ts` loads `.env.local` before graders import (tsx
  doesn't auto-load it, and `USE_REAL_GRADING` is read at module-load time).
- Added `npm run simulate`. Typechecks clean; stub smoke test passes. The
  EXPECTED matrix already demonstrates rubric discrimination (e.g. Brute Forcer
  8/8 Output-Only → 8/12 once efficiency is graded).

**Open follow-up:** run with real grading (needs `OPENAI_API_KEY` /
`ANTHROPIC_API_KEY` + `USE_REAL_GRADING=true`) to populate the ACTUAL matrices;
optional markdown/CSV export of results for the paper.
