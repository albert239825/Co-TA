import type { Persona } from "../types";

// Probes: granular partial credit. The algorithm is right, but
// `enumerate(s, start=1)` shifts every returned index by one — so it
// fails whenever the answer is index 0 (and reports the wrong index
// otherwise). Should earn the structural criteria but miss strict
// correctness / the index-0 edge case.
export const offByOneVictim: Persona = {
  id: "off-by-one-victim",
  name: "Off-by-One Victim",
  summary:
    "Right approach, but enumerate(start=1) makes every index off by one (and breaks index 0). Tests capacity for granular partial credit across criteria.",
  source: "manual",
  category: "competence",
  groundTruth: {
    correctness: "partial", // correct shape, systematically wrong index
    execution: "good",
    efficiency: "good",
    completeness: "partial", // fails the index-0 case
    simplicity: "good",
    readability: "good",
    explanation: "partial",
  },
  submissionText: `from collections import Counter


def first_uniq_char(s):
    counts = Counter(s)
    # off-by-one: enumerate should start at 0, not 1
    for index, char in enumerate(s, start=1):
        if counts[char] == 1:
            return index
    return -1
`,
};
