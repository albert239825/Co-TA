import type { Rubric } from "../types";

// Adds the efficiency constraint the case-study problem is really about.
// This is the rubric that should separate the Brute Forcer from the
// Perfect Student.
export const correctnessAndEfficiency: Rubric = {
  id: "correctness-and-efficiency",
  name: "Correctness + Efficiency",
  description:
    "Output-Only plus an explicit O(n) efficiency criterion.",
  criteria: [
    {
      id: "ce-correctness",
      description:
        "Returns the index of the first non-repeating character for typical inputs.",
      points: 5,
      dimension: "correctness",
    },
    {
      id: "ce-no-unique",
      description: "Returns -1 when every character repeats.",
      points: 3,
      dimension: "completeness",
    },
    {
      id: "ce-efficiency",
      description:
        "Achieves optimal O(n) time: a single frequency pass, not a nested scan over the string.",
      points: 4,
      dimension: "efficiency",
    },
  ],
};
