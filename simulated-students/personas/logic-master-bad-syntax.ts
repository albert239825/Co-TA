import type { Persona } from "../types";

// Probes: conceptual understanding vs. execution. The O(n) hash-map
// logic is perfect, but a missing colon makes the file fail to parse.
// A rubric with no execution criterion cannot tell this apart from the
// Perfect Student.
export const logicMasterBadSyntax: Persona = {
  id: "logic-master-bad-syntax",
  name: "Logic Master w/ Bad Syntax",
  summary:
    "Perfect O(n) logic, but a missing colon causes a syntax error. Tests whether the rubric separates conceptual correctness from working code.",
  source: "manual",
  category: "competence",
  groundTruth: {
    correctness: "good",
    execution: "bad", // missing colon → SyntaxError
    efficiency: "good",
    completeness: "good",
    simplicity: "good",
    readability: "good",
    explanation: "partial",
  },
  submissionText: `from collections import Counter


def first_uniq_char(s):
    counts = Counter(s)
    for index, char in enumerate(s)   # <-- missing colon
        if counts[char] == 1:
            return index
    return -1
`,
};
