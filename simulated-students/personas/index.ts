// Persona registry. Add a new persona file, then list it here.

import type { Persona } from "../types";
import { perfectStudent } from "./perfect-student";
import { logicMasterBadSyntax } from "./logic-master-bad-syntax";
import { cleanCoderWrongLogic } from "./clean-coder-wrong-logic";
import { bruteForcer } from "./brute-forcer";
import { offByOneVictim } from "./off-by-one-victim";
import { overComplicator } from "./over-complicator";
import { emptySubmission } from "./empty-submission";

export const personas: readonly Persona[] = [
  perfectStudent,
  logicMasterBadSyntax,
  cleanCoderWrongLogic,
  bruteForcer,
  offByOneVictim,
  overComplicator,
  emptySubmission,
];
