import type { Rubric } from "../types";

// A full engineering rubric. Every quality dimension gets a criterion,
// so each diagnostic persona should lose points on exactly the criterion
// matching the dimension it flips.
export const comprehensive: Rubric = {
  id: "comprehensive",
  name: "Comprehensive",
  description: "One criterion per quality dimension.",
  criteria: [
    {
      id: "co-correctness",
      description:
        "Returns the correct index of the first non-repeating character for typical inputs.",
      points: 5,
      dimension: "correctness",
    },
    {
      id: "co-completeness",
      description:
        "Handles edge cases: empty string, a unique character at index 0, and all-repeating strings (returns -1).",
      points: 3,
      dimension: "completeness",
    },
    {
      id: "co-efficiency",
      description:
        "Runs in optimal O(n) time (single frequency pass, no nested scan).",
      points: 3,
      dimension: "efficiency",
    },
    {
      id: "co-execution",
      description:
        "Code is syntactically valid and runs without errors.",
      points: 2,
      dimension: "execution",
    },
    {
      id: "co-simplicity",
      description:
        "Solution is appropriately simple — no unnecessary classes or abstraction.",
      points: 2,
      dimension: "simplicity",
    },
    {
      id: "co-readability",
      description:
        "Clear naming, formatting, and PEP-8 conformance.",
      points: 2,
      dimension: "readability",
    },
    {
      id: "co-explanation",
      description:
        "Includes a comment or docstring explaining the approach.",
      points: 3,
      dimension: "explanation",
    },
  ],
};
