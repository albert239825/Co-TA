# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Next.js dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint
npm test              # Run all tests (Vitest, in-memory DB)
npm run test:watch    # Vitest watch mode

# Run a single test file
npx vitest run __tests__/integration/grading.test.ts

# Database
npm run db:push       # Apply schema to local DB (use after cloning or schema changes)
npm run db:generate   # Generate a new migration after editing db/schema.ts
npm run db:studio     # Open Drizzle Studio
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Path to SQLite file. Defaults to `db/co-ta.db`. Tests hard-code `:memory:`. |
| `USE_REAL_GRADING` | Set to `true` to call real LLM APIs instead of the deterministic stub. |
| `OPENAI_API_KEY` | Required when `USE_REAL_GRADING=true`. |

Use `.env.local` (gitignored). Stub grading works with no API key.

## Architecture

Co-TA is a Next.js 14 App Router app. TAs create assignments with rubrics, upload student submissions, trigger AI grading, then review and export results.

### Directory ownership

| Directory | Purpose | Rule |
|---|---|---|
| `contracts/` | Shared API types + model registry | Read-only — do not modify without approval |
| `db/` | SQLite schema, migrations, DB connection | Schema changes require `db:generate` + `db:push` |
| `lib/` | Grading logic, validation, scoring, SSE events | Server-only |
| `src/app/api/` | Next.js API route handlers | All request/response types come from `contracts/types.ts` |
| `src/app/(pages)/` | Frontend pages (App Router) | |
| `src/components/` | Shared UI components | |

### Key data model

```
Assignment → Problems → RubricCriteria
Assignment → Submissions → GradingResult → CriterionScores
```

Scores are computed on read, never stored:
```
criterion effective = overrideScore ?? (earned ? criterion.points : 0)
problem score       = SUM(effective) for all criteria in that problem
```

Submission status lifecycle: `pending → grading → graded → reviewed`

### Grading pipeline

1. `POST /api/grade/batch` — validates request, resolves model fallback chain, fires `gradeSubmissions()` as fire-and-forget
2. Model fallback order: `request.modelId → assignment.selectedModelId → DEFAULT_MODEL_ID` (`gpt-5-mini`)
3. `lib/grading.ts:gradeProblem()` — dispatches to provider adapter based on `contracts/models.ts` registry. Stub is used when `USE_REAL_GRADING` is not `true`. Anthropic adapter is not yet implemented (throws).
4. Results written to `grading_results` + `criterion_scores`. When a grader sets `needsReview=true`, `earned` is clamped to `false`.
5. SSE progress is pushed via `lib/events.ts` (in-memory `EventEmitter`). The SSE route (`/api/grade/stream`) subscribes and forwards events; it removes the listener on client disconnect to prevent memory leaks.

### Model registry

`contracts/models.ts` is the single source of truth for supported LLMs. Zod validation in `lib/validation.ts` rejects unknown model IDs at API boundaries. **Do not add/remove models without approval** — it has cost and product implications.

### Tests

Tests use an in-memory SQLite DB bootstrapped in `__tests__/setup.ts` (raw SQL — mirrors `db/schema.ts` but is maintained separately; keep them in sync when changing the schema).

All API request/response shapes must use types from `contracts/types.ts`. Routes return `ApiError` on failure.
