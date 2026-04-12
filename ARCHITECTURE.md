# Architecture

## Stack
- Next.js 14, App Router
- SQLite + Drizzle ORM (`better-sqlite3` driver)
- OpenAI GPT-4o (JSON mode for grading)
- shadcn/ui + Tailwind

## Agent boundaries

| Directory | Owner | Rule |
|---|---|---|
| `contracts/` | You (orchestrator) | Read-only for all agents |
| `db/` | Devin | Schema, migrations, seed |
| `src/app/api/` | Devin | All backend routes |
| `prompts/` | You | Grading prompt only |
| `src/app/(pages)/` | Claude Code | All frontend pages |
| `src/components/` | Claude Code | Shared UI components |

## API routes

All request/response types are in `contracts/types.ts`. Use them directly.
All routes return `ApiError` on failure with appropriate HTTP status.

### Assignments

`GET /api/assignments`
Returns: `AssignmentResponse[]`

`POST /api/assignments`
Body: `CreateAssignmentRequest`
Returns: `AssignmentResponse` (201)
Notes: creates assignment + problems + criteria in a single transaction.

`GET /api/assignments/[id]`
Returns: `AssignmentResponse`

### Problems

`GET /api/assignments/[id]/problems`
Returns: `ProblemResponse[]`

`POST /api/assignments/[id]/problems`
Body: `CreateProblemInput`
Returns: `ProblemResponse` (201)

### Criteria

`GET /api/problems/[id]/criteria`
Returns: `CriterionResponse[]`

`POST /api/problems/[id]/criteria`
Body: `CreateCriterionInput`
Returns: `CriterionResponse` (201)

### Submissions

`POST /api/submissions`
Body: `UploadSubmissionsRequest`
Returns: `SubmissionListItem[]` (201)
Notes: accepts a batch of submissions. Extracts text from fileContent.
All created with status "pending".

`GET /api/assignments/[id]/submissions`
Returns: `SubmissionListItem[]`
Notes: includes computed scores per problem. Ordered by studentIdentifier.

`GET /api/submissions/[id]`
Returns: `SubmissionDetailResponse`
Notes: full detail including fileContent, grading result, and all criterion scores.

`PATCH /api/submissions/[id]/review`
Returns: `MarkReviewedResponse`
Notes: sets status to "reviewed". Only valid if current status is "graded".

### Grading

`POST /api/grade/batch`
Body: `BatchGradeRequest`
Returns: `BatchGradeResponse`
Notes:
- If submissionIds is empty, grades all "pending" submissions for the assignment.
- For each submission: set status to "grading", call OpenAI, create grading_result
  and criterion_scores rows, set status to "graded".
- Use `Promise.allSettled` to parallelize. On failure, reset status to "pending".
- Emit SSE events as each submission completes.

`GET /api/grade/stream?assignmentId=[id]`
Returns: SSE stream of `GradeStreamEvent`
Notes:
- Content-Type: text/event-stream
- Events: `status_change` (when submission moves to grading/graded),
  `score_ready` (includes computed scores), `batch_complete`, `error`.
- Client reconnects automatically via EventSource.

### Criterion scores

`PATCH /api/criterion-scores/[id]`
Body: `UpdateCriterionScoreRequest`
Returns: `UpdateCriterionScoreResponse`
Notes: sets or clears override. Response includes recomputed submission total.

### Export

`GET /api/export?assignmentId=[id]&format=csv`
Returns: CSV file download
Notes:
- Content-Type: text/csv
- Content-Disposition: attachment; filename="assignment-name-grades.csv"
- Columns: studentIdentifier, [one column per problem], totalScore, feedback
- feedback column: concatenated AI feedback + TA comments, semicolon-separated.
- Only includes submissions with status "graded" or "reviewed".

## Data flow

```
TA creates assignment + rubric
  -> POST /api/assignments (assignment + problems + criteria in one call)

TA uploads submissions
  -> POST /api/submissions (batch of files, all status: pending)

TA clicks "Grade All"
  -> POST /api/grade/batch
  -> backend fans out parallel OpenAI calls
  -> SSE stream pushes status_change and score_ready events
  -> frontend updates triage table row by row

TA clicks into a submission
  -> GET /api/submissions/[id] (full detail with scores)
  -> review screen shows checklist per problem
  -> TA toggles criteria -> PATCH /api/criterion-scores/[id]
  -> TA clicks "Approve" -> PATCH /api/submissions/[id]/review

TA exports grades
  -> GET /api/export?assignmentId=X&format=csv
```

## Computed scores (never stored)

```
criterion effective = overrideScore ?? (earned ? criterion.points : 0)
problem score       = SUM(effective) for criteria in that problem
problem max         = SUM(criterion.points) for criteria in that problem
total score         = SUM(problem scores)
total max           = SUM(problem maxes)
```

## SSE implementation notes

Use a simple in-memory event emitter. The batch grading handler emits events
as each submission completes. The SSE route subscribes to the emitter for
the given assignmentId and forwards events to the client.

```typescript
// shared singleton (e.g. lib/events.ts)
import { EventEmitter } from "events";
export const gradeEvents = new EventEmitter();

// in batch handler:
gradeEvents.emit(`grade:${assignmentId}`, event);

// in SSE route:
gradeEvents.on(`grade:${assignmentId}`, (event) => {
  controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
});
```
