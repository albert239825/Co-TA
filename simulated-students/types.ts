// ─── Shared types for the simulated-student suite ───────────────

import type { DimensionId, Level } from "./dimensions";

/** A base problem that every persona attempts. */
export interface SimProblem {
  id: string;
  /** Maps to GradeProblemPromptInput.assignmentDescription. */
  assignmentDescription: string;
  /** Maps to GradeProblemPromptInput.problemName. */
  problemName: string;
  /** Maps to GradeProblemPromptInput.problemDescription. */
  problemDescription: string;
}

/**
 * A simulated student: a coordinate in the quality-dimension space
 * plus the concrete submission text that realizes it.
 */
export interface Persona {
  id: string;
  name: string;
  /** One line: what rubric behavior / grader bias this persona probes. */
  summary: string;
  /** Ground-truth level on every dimension — the answer key. */
  groundTruth: Record<DimensionId, Level>;
  /** The actual code the "student" submitted. */
  submissionText: string;
}

/**
 * A rubric criterion, extended beyond the app's contract with the
 * dimension it is meant to measure and the minimum level required to
 * earn it. Those two fields let us compute the EXPECTED outcome from a
 * persona's ground truth and compare it to what the LLM actually does.
 */
export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  dimension: DimensionId;
  /** Minimum ground-truth level to earn the point. Defaults to "good". */
  minLevel?: Level;
}

/** A named set of criteria — one column in the results matrix. */
export interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
}
