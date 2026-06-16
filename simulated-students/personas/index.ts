// Persona registry. Add a new persona file, then list it here.
// (personas/_template.ts is the authoring template and is NOT registered.)

import type { Persona } from "../types";

// ── Competence personas — CS1 first-non-repeating-char ──
import { perfectStudent } from "./perfect-student";
import { logicMasterBadSyntax } from "./logic-master-bad-syntax";
import { cleanCoderWrongLogic } from "./clean-coder-wrong-logic";
import { bruteForcer } from "./brute-forcer";
import { offByOneVictim } from "./off-by-one-victim";
import { overComplicator } from "./over-complicator";
import { emptySubmission } from "./empty-submission";

// ── Fairness personas (matched pairs) — CS1 ──
import { fairnessBase } from "./fairness-base";
import { fairnessEsl } from "./fairness-esl";
import { fairnessAccessibility } from "./fairness-accessibility";

// ── Short-answer problem — explain-overfitting ──
import { saCorrectNative } from "./sa-correct-native";
import { saCorrectEsl } from "./sa-correct-esl";
import { saIncomplete } from "./sa-incomplete";
import { saWrong } from "./sa-wrong";

export const personas: readonly Persona[] = [
  perfectStudent,
  logicMasterBadSyntax,
  cleanCoderWrongLogic,
  bruteForcer,
  offByOneVictim,
  overComplicator,
  emptySubmission,
  fairnessBase,
  fairnessEsl,
  fairnessAccessibility,
  saCorrectNative,
  saCorrectEsl,
  saIncomplete,
  saWrong,
];
