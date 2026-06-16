import type { Rubric } from "../types";

// A well-designed content rubric for the short-answer problem: it scores
// what the question asks (concept, mechanism, mitigation) and says nothing
// about writing quality. Under this rubric the native and ESL variants
// should score identically — so any gap the harness reports is grader bias,
// not the rubric.
export const saContent: Rubric = {
  id: "sa-content",
  name: "SA Content",
  description: "Short-answer content only: concept, mechanism, mitigation.",
  problemId: "explain-overfitting",
  criteria: [
    {
      id: "sac-correctness",
      description:
        "Correctly identifies overfitting / the generalization gap as the cause.",
      points: 4,
      dimension: "correctness",
    },
    {
      id: "sac-explanation",
      description:
        "Explains why test error is high (the model fits noise / fails to generalize).",
      points: 3,
      dimension: "explanation",
    },
    {
      id: "sac-mitigation",
      description:
        "Names a valid mitigation (regularization, more data, early stopping, dropout, cross-validation).",
      points: 3,
      dimension: "completeness",
    },
  ],
};
