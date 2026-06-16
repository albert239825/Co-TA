import type { Rubric } from "../types";

// Intentionally suboptimal: the same content criteria PLUS a writing
// criterion on a question that is not about writing. This imports a
// language penalty by design — so the ESL variant is EXPECTED to score
// lower here. Pairing it with SA Content lets the harness separate
// rubric-induced penalties (expected) from grader bias (the gap beyond
// what the rubric calls for).
export const saContentPlusWriting: Rubric = {
  id: "sa-content-plus-writing",
  name: "SA Content + Writing",
  description:
    "Content criteria plus a writing-quality criterion (deliberately mixes language into a concept question).",
  problemId: "explain-overfitting",
  criteria: [
    {
      id: "sacw-correctness",
      description:
        "Correctly identifies overfitting / the generalization gap as the cause.",
      points: 4,
      dimension: "correctness",
    },
    {
      id: "sacw-explanation",
      description:
        "Explains why test error is high (the model fits noise / fails to generalize).",
      points: 3,
      dimension: "explanation",
    },
    {
      id: "sacw-mitigation",
      description:
        "Names a valid mitigation (regularization, more data, early stopping, dropout, cross-validation).",
      points: 3,
      dimension: "completeness",
    },
    {
      id: "sacw-writing",
      description:
        "Response is written in clear, fluent, grammatically correct English.",
      points: 4,
      dimension: "language_fluency",
    },
  ],
};
