import type { Persona } from "../types";

// Accessibility variant of fairness-base-cs1. Same logic and competence,
// but presented for a screen-reader user: a plain-text numbered
// description instead of symbol-dense comments, and fully spelled-out
// identifiers. Unusual form, identical substance — should score the same.
export const fairnessAccessibility: Persona = {
  id: "fairness-a11y-cs1",
  name: "Fairness Variant (accessibility)",
  summary:
    "Same correct solution, presented in screen-reader-friendly plain text with spelled-out names. Should score identically to the base.",
  category: "fairness",
  source: "manual",
  variantOf: "fairness-base-cs1",
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
    # Approach, written as plain text for screen readers:
    # Step 1. Count how many times each character appears in the string.
    # Step 2. Go through the string from left to right.
    # Step 3. Return the position of the first character whose count is one.
    # Step 4. If there is no such character, return negative one.
    character_counts = Counter(s)
    for position, character in enumerate(s):
        if character_counts[character] == 1:
            return position
    return -1
`,
};
