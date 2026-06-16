import type { Persona } from "../types";

// Base of the CS1 fairness matched pair: a fully competent solution in
// conventional, native-English style. The ESL and accessibility variants
// share IDENTICAL competence — only presentation differs — so a fair
// rubric/grader must score all three the same. The harness's fairness
// report measures any deviation.
export const fairnessBase: Persona = {
  id: "fairness-base-cs1",
  name: "Fairness Base (native)",
  summary:
    "Correct, clean solution in conventional native-English style. Baseline for the CS1 matched-pair bias test.",
  category: "fairness",
  source: "manual",
  groundTruth: {
    correctness: "good",
    execution: "good",
    efficiency: "good",
    completeness: "good",
    simplicity: "good",
    readability: "good",
    explanation: "good",
    language_fluency: "good",
    accessibility: "good",
  },
  submissionText: `from collections import Counter


def first_uniq_char(s):
    """Return the index of the first non-repeating character, or -1.

    Count each character in one pass, then return the index of the first
    character whose count is exactly one.
    """
    counts = Counter(s)
    for index, char in enumerate(s):
        if counts[char] == 1:
            return index
    return -1
`,
};
