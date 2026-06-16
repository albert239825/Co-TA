import type { Persona } from "../types";

// Control / ceiling. Everything good — the matrix is only interpretable
// against a known full-marks baseline.
export const perfectStudent: Persona = {
  id: "perfect-student",
  name: "Perfect Student",
  summary:
    "Control case: optimal O(n) logic, clean style, clear explanation. Should earn every criterion under every rubric.",
  groundTruth: {
    correctness: "good",
    execution: "good",
    efficiency: "good",
    completeness: "good",
    simplicity: "good",
    readability: "good",
    explanation: "good",
  },
  submissionText: `from collections import Counter


def first_uniq_char(s: str) -> int:
    """Return the index of the first non-repeating character in s.

    Counts every character in one pass (O(n)), then scans left to right
    and returns the index of the first character whose count is 1.
    Returns -1 when no such character exists (including the empty string).
    """
    counts = Counter(s)
    for index, char in enumerate(s):
        if counts[char] == 1:
            return index
    return -1
`,
};
