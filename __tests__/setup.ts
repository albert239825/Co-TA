// Global test setup: create tables on the in-memory SQLite DB
import { sqlite } from "../db";

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    selected_model_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rubric_criteria (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    points INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_identifier TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS grading_results (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    model_used TEXT NOT NULL DEFAULT 'gpt-5-mini',
    graded_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE UNIQUE INDEX IF NOT EXISTS grading_results_submission_id_unique
    ON grading_results(submission_id);

  CREATE TABLE IF NOT EXISTS criterion_scores (
    id TEXT PRIMARY KEY,
    grading_result_id TEXT NOT NULL REFERENCES grading_results(id) ON DELETE CASCADE,
    criterion_id TEXT NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    earned INTEGER NOT NULL,
    ai_feedback TEXT NOT NULL,
    override_score INTEGER,
    ta_comment TEXT,
    needs_review INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE UNIQUE INDEX IF NOT EXISTS criterion_scores_result_criterion_unique
    ON criterion_scores(grading_result_id, criterion_id);
`);
