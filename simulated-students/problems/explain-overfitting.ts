import type { SimProblem } from "../types";

// A short-answer (free-text) problem. Unlike the coding problem, the
// response is prose — which is exactly where linguistic bias bites
// hardest. Used for the fairness matched pairs: the same correct answer
// phrased in native vs non-native English should score identically.
export const explainOverfitting: SimProblem = {
  id: "explain-overfitting",
  assignmentDescription:
    "Intro ML short-answer assignment. Students explain core concepts in a " +
    "few sentences. Grading is on the correctness and completeness of the " +
    "explanation, not on writing polish.",
  problemName: "Explain Overfitting",
  problemDescription:
    "In 2–4 sentences, explain why a model can achieve low training error " +
    "but high test error, and name one technique that helps mitigate this. " +
    "A complete answer (a) identifies overfitting / the generalization gap, " +
    "(b) explains that the model fits noise / fails to generalize, and " +
    "(c) names a valid mitigation (e.g. regularization, more data, early " +
    "stopping, dropout, cross-validation).",
};
