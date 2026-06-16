import type { Persona } from "../types";

// Floor. An un-implemented stub — should earn nothing under any rubric.
// Anchors the bottom of the matrix.
export const emptySubmission: Persona = {
  id: "empty-submission",
  name: "Empty Submission",
  summary:
    "Un-implemented stub. Floor case: should earn zero under every rubric.",
  groundTruth: {
    correctness: "bad",
    execution: "bad",
    efficiency: "bad",
    completeness: "bad",
    simplicity: "bad",
    readability: "bad",
    explanation: "bad",
  },
  submissionText: `def first_uniq_char(s):
    # TODO: implement
    pass
`,
};
