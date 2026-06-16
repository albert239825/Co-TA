// ─── Shared types for the simulated-student suite ───────────────

import type { DimensionId, Level } from "./dimensions";

/** A base problem that personas attempt. */
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
 * How a persona came to exist. Backs the paper's "co-design" claim:
 * instructors author personas by hand, revise system-generated drafts,
 * or seed them from mistakes seen in prior course offerings.
 */
export type PersonaSource = "manual" | "generated" | "historical";

/**
 * What the persona probes.
 *  - "competence": a quality/failure mode (correctness, efficiency, …).
 *  - "fairness": holds competence constant and varies presentation
 *    (non-native phrasing, accessibility formatting) to detect grading
 *    bias. Matched to a base persona via `variantOf`.
 */
export type PersonaCategory = "competence" | "fairness";

/**
 * A simulated student: a coordinate in the quality-dimension space
 * plus the concrete submission text that realizes it.
 */
export interface Persona {
  id: string;
  name: string;
  /** One line: what rubric behavior / grader bias this persona probes. */
  summary: string;
  /**
   * Ground-truth level per dimension — the answer key. Partial: a persona
   * need only declare the dimensions its problem's rubrics actually score.
   * The harness validates coverage before grading.
   */
  groundTruth: Partial<Record<DimensionId, Level>>;
  /** The actual text/code the "student" submitted. */
  submissionText: string;
  /** Which problem this persona answers. Defaults to the CS1 case study. */
  problemId?: string;
  /** Provenance. Defaults to "manual". */
  source?: PersonaSource;
  /** Probe type. Defaults to "competence". */
  category?: PersonaCategory;
  /**
   * For fairness personas: the id of the base persona this is a
   * presentation-variant of. The pair shares identical competence, so a
   * fair rubric/grader should score them identically (delta = 0).
   */
  variantOf?: string;
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
  /** Which problem this rubric grades. Defaults to the CS1 case study. */
  problemId?: string;
}
