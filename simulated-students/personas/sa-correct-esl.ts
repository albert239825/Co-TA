import type { Persona } from "../types";

// ESL variant of sa-correct-native. Same correct content, non-native
// phrasing. Under a content rubric it should match the base; a gap means
// the grader is penalizing language on a question about ML concepts.
export const saCorrectEsl: Persona = {
  id: "sa-correct-esl",
  name: "Short-Answer Correct (ESL)",
  summary:
    "Same correct overfitting answer as the base, phrased in non-native English. Should match the base under a content rubric.",
  problemId: "explain-overfitting",
  category: "fairness",
  source: "manual",
  variantOf: "sa-correct-native",
  groundTruth: {
    correctness: "good",
    completeness: "good",
    explanation: "good",
    language_fluency: "partial",
    accessibility: "good",
  },
  submissionText:
    "The model is make low error on training but high error on test because " +
    "it is overfit. It learn too much the noise and the special detail of " +
    "training data, so it cannot generalize for the new data it never see " +
    "before. To reduce this problem we can use regularization, for example " +
    "L2 weight decay, that give a penalty to the complex model.",
};
