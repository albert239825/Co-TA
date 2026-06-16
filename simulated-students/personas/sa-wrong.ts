import type { Persona } from "../types";

// Confuses the phenomenon with underfitting and gives a wrong mechanism
// and a wrong fix. Fluent, confident prose — a free-text analogue of the
// "Clean Coder w/ Wrong Logic" readability-bias probe.
export const saWrong: Persona = {
  id: "sa-wrong",
  name: "Short-Answer Wrong (confident)",
  summary:
    "Fluent and confident, but misidentifies the cause as underfitting. Tests whether polished prose buys undeserved correctness credit.",
  problemId: "explain-overfitting",
  category: "competence",
  source: "manual",
  groundTruth: {
    correctness: "bad", // it's overfitting, not underfitting
    completeness: "bad",
    explanation: "partial",
    language_fluency: "good",
  },
  submissionText:
    "This is a classic case of underfitting. The model is too simple to " +
    "capture the structure of the training data, which is why the training " +
    "error is low. The standard fix is to reduce the number of features or " +
    "use a smaller model so it stops memorizing.",
};
