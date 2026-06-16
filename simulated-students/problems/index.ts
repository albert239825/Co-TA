// Problem registry. Personas and rubrics reference a problem by id;
// when they omit it, they default to DEFAULT_PROBLEM_ID.

import type { SimProblem } from "../types";
import { firstNonRepeatingChar } from "./first-non-repeating-char";
import { explainOverfitting } from "./explain-overfitting";

export const problems: readonly SimProblem[] = [
  firstNonRepeatingChar,
  explainOverfitting,
];

/** Personas/rubrics with no explicit problemId belong to this problem. */
export const DEFAULT_PROBLEM_ID = firstNonRepeatingChar.id;

export function getProblem(id: string): SimProblem | undefined {
  return problems.find((p) => p.id === id);
}
