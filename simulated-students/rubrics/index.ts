// Rubric registry. Each rubric is one column in its problem's matrix.

import type { Rubric } from "../types";

// ── CS1 first-non-repeating-char ──
import { outputOnly } from "./output-only";
import { correctnessAndEfficiency } from "./correctness-and-efficiency";
import { comprehensive } from "./comprehensive";

// ── Short-answer explain-overfitting ──
import { saContent } from "./sa-content";
import { saContentPlusWriting } from "./sa-content-plus-writing";

export const rubrics: readonly Rubric[] = [
  outputOnly,
  correctnessAndEfficiency,
  comprehensive,
  saContent,
  saContentPlusWriting,
];
