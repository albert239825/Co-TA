import type { Persona } from "../types";

// Probes: efficiency enforcement. Correct output, but an O(n^2)
// nested scan. Only a rubric with an explicit efficiency criterion
// should dock points here.
export const bruteForcer: Persona = {
  id: "brute-forcer",
  name: "Brute Forcer",
  summary:
    "Correct result via nested loops — O(n^2) instead of O(n). Tests whether the rubric enforces the efficiency constraint.",
  source: "manual",
  category: "competence",
  groundTruth: {
    correctness: "good",
    execution: "good",
    efficiency: "bad", // O(n^2) nested scan
    completeness: "good",
    simplicity: "good", // nested loops are simple, just slow
    readability: "good",
    explanation: "bad", // no comments
  },
  submissionText: `def first_uniq_char(s):
    for i in range(len(s)):
        is_unique = True
        for j in range(len(s)):
            if i != j and s[i] == s[j]:
                is_unique = False
                break
        if is_unique:
            return i
    return -1
`,
};
