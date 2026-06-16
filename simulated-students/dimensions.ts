// ─── Quality dimensions ─────────────────────────────────────────
//
// The systematic backbone of the simulated-student suite. Every
// student submission is a point in this space: an independent level
// on each orthogonal quality dimension. A "persona" is a chosen
// coordinate plus the concrete code that realizes it.
//
// The diagnostic personas (logic-master-bad-syntax, brute-forcer, …)
// each hold every dimension at "good" and flip exactly ONE to "bad"
// (or "partial"). That isolation is what makes them probe a single
// rubric behavior / grader bias at a time.
// ─────────────────────────────────────────────────────────────────

/** Uniform 3-level scale applied to every dimension. */
export type Level = "good" | "partial" | "bad";

export type DimensionId =
  // ── Competence: what the work demonstrates ──
  | "correctness" // does the algorithm/logic actually solve the problem?
  | "execution" // does the code run (no syntax / runtime errors)?
  | "efficiency" // is the time/space complexity optimal (here: O(n))?
  | "completeness" // edge cases — empty string, index 0, all-repeat, etc.
  | "simplicity" // appropriately simple; no needless abstraction
  | "readability" // naming, formatting, PEP-8
  | "explanation" // comments / docstring explaining the approach
  // ── Presentation: form, decoupled from competence ──
  // These describe HOW a response is presented, not whether it is correct.
  // A fair, content-focused rubric should NOT let them change the score —
  // the fairness personas (matched pairs) measure whether the grader does.
  | "language_fluency" // native vs non-native / ESL phrasing
  | "accessibility"; // accessible presentation (plain-text math, no reliance on visual layout)

export interface DimensionMeta {
  id: DimensionId;
  label: string;
  description: string;
  /** What each level means for this dimension (for the README + reports). */
  levels: Record<Level, string>;
}

export const DIMENSIONS: readonly DimensionMeta[] = [
  {
    id: "correctness",
    label: "Conceptual correctness",
    description: "Does the underlying logic solve the stated problem?",
    levels: {
      good: "Logic is correct for the general case.",
      partial: "Mostly correct but fails a class of inputs (e.g. off-by-one).",
      bad: "Logic is wrong / solves a different problem.",
    },
  },
  {
    id: "execution",
    label: "Execution validity",
    description: "Does the code run without syntax or runtime errors?",
    levels: {
      good: "Runs cleanly.",
      partial: "Runs but produces no useful result (e.g. empty stub).",
      bad: "Fails to parse / raises before producing output.",
    },
  },
  {
    id: "efficiency",
    label: "Efficiency",
    description: "Is the complexity optimal? Optimal here is O(n).",
    levels: {
      good: "Optimal O(n).",
      partial: "Worse than optimal but not pathological.",
      bad: "Pathological (e.g. nested-scan O(n^2)).",
    },
  },
  {
    id: "completeness",
    label: "Completeness / edge cases",
    description: "Handles boundaries: empty string, index 0, all-repeat.",
    levels: {
      good: "Handles the edge cases.",
      partial: "Misses some edge cases.",
      bad: "Ignores edge cases entirely.",
    },
  },
  {
    id: "simplicity",
    label: "Simplicity",
    description: "Appropriately simple; no unnecessary complexity.",
    levels: {
      good: "As simple as the problem warrants.",
      partial: "Somewhat more complex than needed.",
      bad: "Heavily over-engineered for the task.",
    },
  },
  {
    id: "readability",
    label: "Readability / style",
    description: "Naming, formatting, PEP-8 conformance.",
    levels: {
      good: "Clean and idiomatic.",
      partial: "Readable but rough in places.",
      bad: "Hard to read / non-idiomatic.",
    },
  },
  {
    id: "explanation",
    label: "Explanation",
    description: "Comments or docstring explaining the approach.",
    levels: {
      good: "Clear explanation of the approach.",
      partial: "Sparse / incomplete explanation.",
      bad: "No explanation at all.",
    },
  },
  {
    id: "language_fluency",
    label: "Language fluency (presentation)",
    description:
      "Native vs non-native / ESL phrasing. Form only — must not change a content score.",
    levels: {
      good: "Fluent, native-like phrasing.",
      partial: "Non-native phrasing, but the meaning is clear.",
      bad: "Language errors that genuinely obscure the meaning.",
    },
  },
  {
    id: "accessibility",
    label: "Accessibility (presentation)",
    description:
      "Accessible presentation (plain-text math, no reliance on visual layout). Form only — must not change a content score.",
    levels: {
      good: "Accessible: plain-text, screen-reader friendly.",
      partial: "Some accessibility barriers.",
      bad: "Inaccessible: relies on visual formatting / unexplained symbols.",
    },
  },
] as const;

const LEVEL_RANK: Record<Level, number> = { good: 2, partial: 1, bad: 0 };

/** Numeric rank for threshold comparisons (good > partial > bad). */
export function rank(level: Level): number {
  return LEVEL_RANK[level];
}
