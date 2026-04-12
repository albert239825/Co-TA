# Co-TA Integration Testing Skill

## Overview
This skill covers end-to-end testing of the Co-TA grading assistant, focusing on the frontend ↔ backend integration flow.

## Devin Secrets Needed
- `OPENAI_API_KEY` — Required for GPT-4o grading. Without it, the backend may use stub grading.

## Setup

1. Install dependencies: `npm install`
2. Create `.env.local` at repo root with `OPENAI_API_KEY=<secret>`
3. Sync database: `npm run db:push` (SQLite at `db/co-ta.db`)
4. Start dev server: `npm run dev` (port 3000)
5. Install `sqlite3` if you need to inspect the database directly: `sudo apt-get install -y sqlite3`

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assignments` | GET | List all assignments |
| `/api/assignments` | POST | Create assignment with rubric |
| `/api/assignments/:id` | GET | Get single assignment |
| `/api/assignments/:id/submissions` | GET | List submissions for assignment |
| `/api/submissions` | POST | Upload submissions (no UI — use curl) |
| `/api/submissions/:id` | GET | Get submission detail with grading |
| `/api/submissions/:id/review` | PATCH | Approve/review a submission |
| `/api/criterion-scores/:id` | PATCH | Toggle criterion override |
| `/api/grade/batch` | POST | Start batch grading, returns `{ streamUrl }` |
| `/api/grade/stream` | GET (SSE) | Real-time grading events stream |
| `/api/export` | GET | Export CSV (`?assignmentId=X&format=csv`) |

## Test Flow

### 1. Create Assignment
- Navigate to `/assignments/new`
- Fill in name, prompt, problems with criteria
- Click "Create assignment"
- **Verify:** Redirected to `/assignments/<real-uuid>` (not a mock UUID)

### 2. Upload Submissions (via curl — no upload UI exists)
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "<ASSIGNMENT_ID>",
    "files": [
      { "studentIdentifier": "Alice Smith", "fileName": "hw1_alice.txt", "fileContent": "Q1: answer...\nQ2: answer..." },
      { "studentIdentifier": "Bob Jones", "fileName": "hw1_bob.txt", "fileContent": "Q1: answer...\nQ2: answer..." }
    ]
  }'
```
- **Verify:** Refresh triage page, submissions appear as "Pending"

### 3. Grade All Pending
- Click "Grade all pending" on the triage page
- Button should change to "Grading..."
- **Verify:** After grading completes, scores appear in the table (may need page refresh — see Known Issues)

### 4. Review Submission
- Click on a graded submission row
- **Verify:** Review page shows submission text, rubric criteria with AI feedback, and scores
- Toggle a criterion (click the check/X icon)
- **Verify:** Score updates immediately, "TA override" label appears

### 5. Approve Submission
- Click "Approve and next"
- **Verify:** Redirected to triage, submission status changes to "Reviewed"

### 6. Export CSV
- Click "Export CSV" on triage page
- **Verify:** CSV file downloads with correct headers and data

## Known Issues

### SSE Real-Time Updates May Not Work
The SSE stream from `/api/grade/stream` might not push live updates to the triage table. This is a **race condition**: the backend fires events before the EventSource connection is fully established. With stub grading (very fast), events are sent before the client is ready to receive them.

**Workaround:** Refresh the page after the "Grading..." button returns to "Grade all pending" (or after ~30 seconds). The graded scores will be visible from the database.

**Note:** With real GPT-4o grading (which takes longer per submission), this race condition may not manifest because the EventSource has time to connect before events fire.

### Stub Grading
If the `OPENAI_API_KEY` is invalid or the OpenAI API is unreachable, the backend might fall back to stub grading that returns `[STUB]` prefixed feedback. The scores will still be computed but may not reflect actual AI analysis.

## Database Inspection
To check submission status directly:
```bash
sqlite3 db/co-ta.db "SELECT id, student_identifier, status FROM submissions;"
```

To check grading scores:
```bash
sqlite3 db/co-ta.db "SELECT s.student_identifier, p.name, rc.description, rc.points, cs.earned FROM criterion_scores cs JOIN grading_results gr ON cs.grading_result_id = gr.id JOIN submissions s ON gr.submission_id = s.id JOIN rubric_criteria rc ON cs.criterion_id = rc.id JOIN problems p ON rc.problem_id = p.id ORDER BY s.student_identifier, p.name;"
```

## Lint
```bash
npm run lint
```
