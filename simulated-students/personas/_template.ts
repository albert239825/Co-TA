import type { Persona } from "../types";

// ─── Persona template (manual authoring) ────────────────────────
//
// Copy this file, rename it, fill in the fields, then register it in
// personas/index.ts. This file is intentionally NOT in the registry.
//
// Checklist:
//   1. id / name / summary — summary states what this persona PROBES.
//   2. problemId — omit for the CS1 case study; set it for another problem.
//   3. source — "manual" (you wrote it), "generated" (LLM draft you
//      revised — see generate.ts), or "historical" (a real prior-offering
//      mistake you reproduced).
//   4. category — "competence" (a quality/failure mode) or "fairness"
//      (same competence as a base persona, different presentation).
//   5. variantOf — fairness only: the base persona id this is a variant of.
//   6. groundTruth — the answer key. Declare every dimension that this
//      problem's rubrics score (the harness validates coverage).
//   7. submissionText — the actual student submission.
export const templatePersona: Persona = {
  id: "template-persona",
  name: "Template Persona",
  summary: "What rubric behavior or grader bias does this persona probe?",
  // problemId: "explain-overfitting",
  source: "manual",
  category: "competence",
  // variantOf: "some-base-persona-id",
  groundTruth: {
    correctness: "good",
    // execution: "good",
    // efficiency: "good",
    // completeness: "good",
    // simplicity: "good",
    // readability: "good",
    // explanation: "good",
    // language_fluency: "good",
    // accessibility: "good",
  },
  submissionText: `# the student's submission goes here`,
};
