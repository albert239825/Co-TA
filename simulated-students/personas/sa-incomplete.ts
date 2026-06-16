import type { Persona } from "../types";

// Correctly identifies overfitting and explains it, but never names a
// mitigation technique. Should earn correctness + explanation but miss
// the completeness criterion.
export const saIncomplete: Persona = {
  id: "sa-incomplete",
  name: "Short-Answer Incomplete",
  summary:
    "Identifies and explains overfitting but names no mitigation. Tests whether the rubric enforces completeness.",
  problemId: "explain-overfitting",
  category: "competence",
  source: "manual",
  groundTruth: {
    correctness: "good",
    completeness: "bad", // no mitigation named
    explanation: "good",
    language_fluency: "good",
  },
  submissionText:
    "This happens because of overfitting: the model fits the training data " +
    "too closely, including its noise, so it does not generalize to new data " +
    "and the test error ends up high.",
};
