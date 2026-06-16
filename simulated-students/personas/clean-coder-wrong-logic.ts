import type { Persona } from "../types";

// Probes: "readability bias." Beautifully formatted, type-hinted,
// docstring'd code — but the comparison is inverted (returns the first
// REPEATING character). A biased grader may award correctness because
// the code *looks* authoritative.
export const cleanCoderWrongLogic: Persona = {
  id: "clean-coder-wrong-logic",
  name: "Clean Coder w/ Wrong Logic",
  summary:
    "PEP-8 perfect, well-documented, but the logic is inverted (returns the first repeating char). Tests the grader for readability bias.",
  groundTruth: {
    correctness: "bad", // `> 1` should be `== 1`
    execution: "good",
    efficiency: "good",
    completeness: "bad", // wrong answer for essentially all inputs
    simplicity: "good",
    readability: "good",
    explanation: "good",
  },
  submissionText: `from collections import Counter


def first_uniq_char(s: str) -> int:
    """Return the index of the first non-repeating character in s.

    Builds a frequency table in a single pass and returns the index of
    the first character that does not recur. Returns -1 if none exists.
    """
    frequencies: Counter[str] = Counter(s)

    for index, char in enumerate(s):
        if frequencies[char] > 1:  # BUG: should be == 1
            return index

    return -1
`,
};
