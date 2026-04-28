// ─── Shared API types ───────────────────────────────────────
//
// This file is the single source of truth for request/response
// shapes. Both frontend and backend import from here.
// Agents: READ this file. Do NOT modify it.
//
// ─────────────────────────────────────────────────────────────

// ─── Status enum ────────────────────────────────────────────

export type SubmissionStatus = "pending" | "grading" | "graded" | "reviewed";

// ─── Assignments ────────────────────────────────────────────

export interface CreateAssignmentRequest {
  name: string;
  description: string; // the full assignment prompt
  problems: CreateProblemInput[]; // create rubric in one shot
  selectedModelId?: string | null; // optional: overrides default model for this assignment
}

export interface CreateProblemInput {
  name: string;
  description: string;
  sortOrder: number;
  criteria: CreateCriterionInput[];
}

export interface CreateCriterionInput {
  description: string;
  points: number;
  sortOrder: number;
}

// ─── Edit assignment (full upsert) ──────────────────────────

export interface EditAssignmentRequest {
  name: string;
  description: string;
  selectedModelId?: string | null;
  problems: EditProblemInput[];
  /** When true, reset all graded/reviewed submissions back to pending. */
  resetGrades?: boolean;
}

export interface EditProblemInput {
  id?: string; // present → update existing; absent → create new
  name: string;
  description: string;
  sortOrder: number;
  criteria: EditCriterionInput[];
}

export interface EditCriterionInput {
  id?: string; // present → update existing; absent → create new
  description: string;
  points: number;
  sortOrder: number;
}

export interface AssignmentResponse {
  id: string;
  name: string;
  description: string;
  maxScore: number; // computed: sum of all criteria points
  selectedModelId: string | null; // persisted per-assignment model choice (null = use default)
  problems: ProblemResponse[];
  createdAt: string; // ISO 8601
}

// Partial update for per-assignment settings (currently just model selection).
export interface UpdateAssignmentRequest {
  selectedModelId?: string | null;
}

export interface UpdateAssignmentResponse {
  id: string;
  selectedModelId: string | null;
}

export interface EditAssignmentResponse extends AssignmentResponse {
  /** Number of submissions that were reset to pending (0 if resetGrades was false). */
  submissionsReset: number;
}

export interface ProblemResponse {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  maxScore: number; // computed: sum of criteria points in this problem
  criteria: CriterionResponse[];
}

export interface CriterionResponse {
  id: string;
  description: string;
  points: number;
  sortOrder: number;
}

// ─── Submissions ────────────────────────────────────────────

export interface UploadSubmissionsRequest {
  assignmentId: string;
  files: SubmissionFileInput[];
}

export interface SubmissionFileInput {
  studentIdentifier: string;
  fileName: string;
  fileContent: string; // extracted text
}

export interface SubmissionListItem {
  id: string;
  studentIdentifier: string;
  fileName: string;
  status: SubmissionStatus;
  totalScore: number | null; // null if not yet graded
  maxScore: number;
  problemScores: ProblemScoreSummary[];
}

export interface ProblemScoreSummary {
  problemId: string;
  problemName: string;
  score: number;
  maxScore: number;
}

// ─── Grading ────────────────────────────────────────────────

export interface BatchGradeRequest {
  assignmentId: string;
  submissionIds: string[]; // which submissions to grade (or all if empty)
  // Optional per-run override. If omitted, backend falls back to the
  // assignment's selectedModelId, then to DEFAULT_MODEL_ID.
  modelId?: string;
}

export interface BatchGradeResponse {
  started: number; // count of submissions queued
  streamUrl: string; // SSE endpoint to watch progress
}

// SSE event shapes (sent as JSON in event.data)
export interface GradeStreamEvent {
  type: "status_change" | "score_ready" | "batch_complete" | "error";
  submissionId: string;
  status?: SubmissionStatus;
  totalScore?: number;
  problemScores?: ProblemScoreSummary[];
  error?: string;
  timestamp: string; // ISO 8601
}

// ─── Review + override ──────────────────────────────────────

export interface SubmissionDetailResponse {
  id: string;
  studentIdentifier: string;
  fileName: string;
  fileContent: string; // the actual submission text
  status: SubmissionStatus;
  totalScore: number;
  maxScore: number;
  gradingResult: GradingResultResponse | null;
}

export interface GradingResultResponse {
  id: string;
  modelUsed: string;
  gradedAt: string;
  problems: ProblemGradeResponse[];
}

export interface ProblemGradeResponse {
  problemId: string;
  problemName: string;
  problemDescription: string;
  score: number;
  maxScore: number;
  criteria: CriterionScoreResponse[];
}

export interface CriterionScoreResponse {
  criterionScoreId: string; // the criterion_scores row id
  criterionId: string;
  description: string;
  points: number;
  earned: boolean;
  aiFeedback: string;
  overrideScore: number | null;
  taComment: string | null;
  // Binary confidence flag emitted by the grader. When true, the UI
  // renders a yellow "needs manual review" state and the criterion
  // defaults to earned=false until the TA reviews it.
  needsReview: boolean;
  effectiveScore: number; // computed: overrideScore ?? (earned ? points : 0)
}

export interface UpdateCriterionScoreRequest {
  overrideScore: number | null; // null to clear override and accept AI
  taComment?: string | null;
  // Optional: TA can explicitly clear/set the needs-review flag.
  // Server ignores if the caller didn't send the field.
  needsReview?: boolean;
}

export interface UpdateCriterionScoreResponse {
  criterionScoreId: string;
  effectiveScore: number;
  newTotalScore: number; // recomputed submission total
}

// ─── Mark reviewed ──────────────────────────────────────────

export interface MarkReviewedResponse {
  submissionId: string;
  status: "reviewed";
}

// ─── Export ─────────────────────────────────────────────────

export interface ExportQueryParams {
  assignmentId: string;
  format: "csv"; // extensible later
}

// CSV columns: studentIdentifier, problem1Score, problem2Score, ..., totalScore, feedback
// returned as Content-Type: text/csv with Content-Disposition: attachment

// ─── AI grading prompt types ────────────────────────────────
//
// These define what we send to / receive from OpenAI.
// Grading is done per-problem: one LLM call per (submission, problem) pair.
// The grading API route transforms between these and the DB types.
// Segmentation of submission text into per-problem chunks is handled
// upstream (student selection or AI splitting — TBD).

export interface GradeProblemPromptInput {
  assignmentDescription: string;
  problemName: string;
  problemDescription: string;
  criteria: GradePromptCriterion[];
  submissionText: string; // the relevant chunk for this problem
}

export interface GradePromptCriterion {
  criterionId: string;
  description: string;
  points: number;
}

// what the LLM returns (JSON mode) — scores for one problem's criteria
export interface GradeProblemPromptOutput {
  scores: GradePromptCriterionResult[];
}

export interface GradePromptCriterionResult {
  criterionId: string;
  earned: boolean;
  feedback: string; // specific to the student's work, not generic
  // Optional: grader may emit a binary confidence flag. When true,
  // the backend persists needs_review=true and clamps earned=false.
  needsReview?: boolean;
}

// ─── Error shape ────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

// ─── Model registry ─────────────────────────────────────────

export type ModelProvider = "openai" | "anthropic" | "stub";

export interface ModelInfo {
  id: string; // stable machine id, e.g. "claude-sonnet-4-6"
  provider: ModelProvider;
  displayName: string; // user-facing name for the picker UI
  description: string; // one-liner shown under the displayName
}

export interface ListModelsResponse {
  models: ModelInfo[];
  defaultModelId: string;
}
