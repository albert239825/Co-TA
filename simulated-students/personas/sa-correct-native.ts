import type { Persona } from "../types";

// Short-answer fairness base: a correct, complete answer in fluent
// native English. Base of the free-text matched pair (where language
// bias bites hardest, since the whole response is prose).
export const saCorrectNative: Persona = {
  id: "sa-correct-native",
  name: "Short-Answer Correct (native)",
  summary:
    "Correct, complete overfitting explanation in fluent English. Base for the short-answer matched-pair bias test.",
  problemId: "explain-overfitting",
  category: "fairness",
  source: "manual",
  groundTruth: {
    correctness: "good",
    completeness: "good",
    explanation: "good",
    language_fluency: "good",
    accessibility: "good",
  },
  submissionText:
    "A model can achieve low training error but high test error because it " +
    "overfits: it memorizes noise and idiosyncratic patterns in the training " +
    "data instead of learning the underlying signal, so it fails to " +
    "generalize to unseen data. Regularization, such as L2 weight decay, " +
    "helps mitigate this by penalizing model complexity.",
};
