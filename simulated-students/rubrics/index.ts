// Rubric registry. Each rubric is one column in the results matrix.

import type { Rubric } from "../types";
import { outputOnly } from "./output-only";
import { correctnessAndEfficiency } from "./correctness-and-efficiency";
import { comprehensive } from "./comprehensive";

export const rubrics: readonly Rubric[] = [
  outputOnly,
  correctnessAndEfficiency,
  comprehensive,
];
