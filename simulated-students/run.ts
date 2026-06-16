// ─── Simulated-student grading harness ──────────────────────────
//
// Grades every persona against every rubric using the real grading
// pipeline (lib/grading → lib/graders), then prints:
//   1. An EXPECTED score matrix (from each persona's ground truth).
//   2. An ACTUAL score matrix per model (what the LLM grader produced).
//   3. Grader accuracy vs ground truth, per rubric.
//   4. Optional per-criterion mismatch detail (--details).
//
// Usage:
//   USE_REAL_GRADING=true OPENAI_API_KEY=... npx tsx simulated-students/run.ts
//   USE_REAL_GRADING=true SIM_MODELS=gpt-5-mini,claude-sonnet-4-6 npx tsx simulated-students/run.ts --details
//
// Without USE_REAL_GRADING=true the deterministic stub is used; it
// ignores submission content, so the matrix will NOT discriminate
// between personas — useful only as a smoke test of the harness.
// ─────────────────────────────────────────────────────────────────

import "./load-env"; // MUST be first: populates process.env before graders load
import { gradeProblem } from "../lib/grading";
import { DEFAULT_MODEL_ID } from "../contracts/models";
import type { GradeProblemPromptInput } from "../contracts/types";
import { rank } from "./dimensions";
import type { Persona, Rubric, RubricCriterion } from "./types";
import { firstNonRepeatingChar as problem } from "./problems/first-non-repeating-char";
import { personas } from "./personas";
import { rubrics } from "./rubrics";

const SHOW_DETAILS = process.argv.includes("--details");
const MODELS = (process.env.SIM_MODELS ?? DEFAULT_MODEL_ID)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

interface CellResult {
  score: number;
  max: number;
  /** criteria where actual earned == expected earned */
  matched: number;
  total: number;
  rows: {
    criterion: RubricCriterion;
    expected: boolean;
    actual: boolean;
    needsReview: boolean;
    feedback: string;
  }[];
}

/** Expected outcome for a criterion, derived from the persona ground truth. */
function expectedEarned(persona: Persona, c: RubricCriterion): boolean {
  return rank(persona.groundTruth[c.dimension]) >= rank(c.minLevel ?? "good");
}

function expectedCell(persona: Persona, rubric: Rubric): { score: number; max: number } {
  let score = 0;
  let max = 0;
  for (const c of rubric.criteria) {
    max += c.points;
    if (expectedEarned(persona, c)) score += c.points;
  }
  return { score, max };
}

async function gradeCell(
  persona: Persona,
  rubric: Rubric,
  modelId: string,
): Promise<CellResult> {
  const input: GradeProblemPromptInput = {
    assignmentDescription: problem.assignmentDescription,
    problemName: problem.problemName,
    problemDescription: problem.problemDescription,
    criteria: rubric.criteria.map((c) => ({
      criterionId: c.id,
      description: c.description,
      points: c.points,
    })),
    submissionText: persona.submissionText,
  };

  const output = await gradeProblem(input, modelId);
  const byId = new Map(output.scores.map((s) => [s.criterionId, s]));

  let score = 0;
  let max = 0;
  let matched = 0;
  const rows: CellResult["rows"] = [];

  for (const c of rubric.criteria) {
    const result = byId.get(c.id);
    const needsReview = result?.needsReview ?? false;
    // Mirror the route: needsReview clamps earned to false.
    const actual = result ? (needsReview ? false : result.earned) : false;
    const expected = expectedEarned(persona, c);
    max += c.points;
    if (actual) score += c.points;
    if (actual === expected) matched++;
    rows.push({
      criterion: c,
      expected,
      actual,
      needsReview,
      feedback: result?.feedback ?? "(no result returned)",
    });
  }

  return { score, max, matched, total: rubric.criteria.length, rows };
}

// ─── Text-table helpers ─────────────────────────────────────────

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function printMatrix(
  title: string,
  rowLabels: string[],
  colLabels: string[],
  cell: (r: number, c: number) => string,
): void {
  const labelW = Math.max(...rowLabels.map((l) => l.length), 0) + 2;
  const colW = Math.max(...colLabels.map((l) => l.length), 9) + 2;

  console.log(`\n${title}`);
  let header = pad("", labelW);
  for (const cl of colLabels) header += pad(cl, colW);
  console.log(header);
  console.log("-".repeat(header.length));

  for (let r = 0; r < rowLabels.length; r++) {
    let line = pad(rowLabels[r], labelW);
    for (let c = 0; c < colLabels.length; c++) line += pad(cell(r, c), colW);
    console.log(line);
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const real = process.env.USE_REAL_GRADING === "true";

  console.log("═".repeat(72));
  console.log("  Simulated-student rubric comparison");
  console.log(`  Problem : ${problem.problemName}`);
  console.log(`  Personas: ${personas.length}   Rubrics: ${rubrics.length}`);
  console.log(`  Backend : ${real ? `REAL grading — models: ${MODELS.join(", ")}` : "STUB (set USE_REAL_GRADING=true for real results)"}`);
  console.log("═".repeat(72));

  if (!real) {
    console.log(
      "\n⚠️  Stub grading ignores submission content — the matrix below will\n" +
        "    not discriminate between personas. Use it only to verify the\n" +
        "    harness runs. Set USE_REAL_GRADING=true (+ API keys) for real data.",
    );
  }

  const rubricLabels = rubrics.map((r) => r.name);
  const personaLabels = personas.map((p) => p.name);

  // 1. Expected matrix (ground truth) — model-independent.
  printMatrix(
    "EXPECTED scores (from ground truth)  [score/max]",
    personaLabels,
    rubricLabels,
    (r, c) => {
      const { score, max } = expectedCell(personas[r], rubrics[c]);
      return `${score}/${max}`;
    },
  );

  // 2. Actual matrix per model + accuracy.
  for (const modelId of MODELS) {
    console.log(`\n${"━".repeat(72)}`);
    console.log(`  MODEL: ${modelId}`);
    console.log("━".repeat(72));

    // results[personaIndex][rubricIndex]
    const results: CellResult[][] = [];
    for (let pi = 0; pi < personas.length; pi++) {
      results[pi] = [];
      for (let ri = 0; ri < rubrics.length; ri++) {
        if (process.stdout.isTTY) {
          process.stdout.write(
            `  grading ${pad(personas[pi].name, 26)} × ${pad(rubrics[ri].name, 26)}\r`,
          );
        }
        results[pi][ri] = await gradeCell(personas[pi], rubrics[ri], modelId);
      }
    }
    if (process.stdout.isTTY) process.stdout.write(" ".repeat(72) + "\r");

    printMatrix(
      `ACTUAL scores — ${modelId}  [score/max]`,
      personaLabels,
      rubricLabels,
      (r, c) => `${results[r][c].score}/${results[r][c].max}`,
    );

    printMatrix(
      `GRADER ACCURACY vs ground truth — ${modelId}  [matched/criteria]`,
      personaLabels,
      rubricLabels,
      (r, c) => `${results[r][c].matched}/${results[r][c].total}`,
    );

    // Per-rubric aggregate accuracy.
    console.log(`\nPer-rubric accuracy — ${modelId}`);
    for (let ri = 0; ri < rubrics.length; ri++) {
      let matched = 0;
      let total = 0;
      for (let pi = 0; pi < personas.length; pi++) {
        matched += results[pi][ri].matched;
        total += results[pi][ri].total;
      }
      const pct = total ? Math.round((matched / total) * 100) : 0;
      console.log(`  ${pad(rubrics[ri].name, 28)} ${matched}/${total}  (${pct}%)`);
    }

    if (SHOW_DETAILS) {
      console.log(`\nMISMATCHES — ${modelId} (actual ≠ expected)`);
      let any = false;
      for (let pi = 0; pi < personas.length; pi++) {
        for (let ri = 0; ri < rubrics.length; ri++) {
          for (const row of results[pi][ri].rows) {
            if (row.actual === row.expected) continue;
            any = true;
            console.log(
              `  [${personas[pi].name} × ${rubrics[ri].name}] ${row.criterion.id}\n` +
                `    expected=${row.expected} actual=${row.actual}` +
                `${row.needsReview ? " (needsReview)" : ""}\n` +
                `    criterion: ${row.criterion.description}\n` +
                `    feedback:  ${row.feedback}`,
            );
          }
        }
      }
      if (!any) console.log("  (none — grader matched ground truth everywhere)");
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\n❌ Harness failed:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
