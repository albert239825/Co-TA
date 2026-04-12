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

export interface AssignmentResponse {
  id: string;
  name: string;
  description: string;
  maxScore: number; // computed: sum of all criteria points
  problems: ProblemResponse[];
  createdAt: string; // ISO 8601
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
  effectiveScore: number; // computed: overrideScore ?? (earned ? points : 0)
}

export interface UpdateCriterionScoreRequest {
  overrideScore: number | null; // null to clear override and accept AI
  taComment?: string | null;
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

export interface ExportRequest {
  assignmentId: string;
  format: "csv"; // extensible later
}

// CSV columns: studentIdentifier, problem1Score, problem2Score, ..., totalScore, feedback
// returned as Content-Type: text/csv with Content-Disposition: attachment

// ─── AI grading prompt types ────────────────────────────────
//
// These define what we send to / receive from OpenAI.
// The grading API route transforms between these and the DB types.

export interface GradePromptInput {
  assignmentDescription: string;
  problems: GradePromptProblem[];
  submissionText: string;
}

export interface GradePromptProblem {
  problemId: string;
  problemName: string;
  problemDescription: string;
  criteria: GradePromptCriterion[];
}

export interface GradePromptCriterion {
  criterionId: string;
  description: string;
  points: number;
}

// what the LLM returns (JSON mode)
export interface GradePromptOutput {
  scores: GradePromptCriterionResult[];
}

export interface GradePromptCriterionResult {
  criterionId: string;
  earned: boolean;
  feedback: string; // specific to the student's work, not generic
}

// ─── Error shape ────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
