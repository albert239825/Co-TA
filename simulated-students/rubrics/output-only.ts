import type { Rubric } from "../types";

// The naive rubric a hurried TA might write: only cares whether the
// output is right. Cannot distinguish slow-but-correct, ugly-but-correct,
// or even doesn't-run-but-correct-on-paper from a perfect submission.
export const outputOnly: Rubric = {
  id: "output-only",
  name: "Output-Only",
  description:
    "Correctness of the result only. No efficiency, style, or execution checks.",
  criteria: [
    {
      id: "oo-correctness",
      description:
        "Returns the index of the first non-repeating character for typical inputs.",
      points: 5,
      dimension: "correctness",
    },
    {
      id: "oo-no-unique",
      description: "Returns -1 when every character repeats.",
      points: 3,
      dimension: "completeness",
    },
  ],
};
