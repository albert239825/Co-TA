// ─── Simulated-student grading harness ──────────────────────────
//
// Grades every persona against every rubric for its problem using the
// real grading pipeline (lib/grading → lib/graders), then prints, per
// problem:
//   1. A persona legend (provenance: source + category).
//   2. An EXPECTED score matrix (from each persona's ground truth).
//   3. An ACTUAL score matrix per model (what the LLM grader produced).
//   4. Grader accuracy vs ground truth, per rubric.
//   5. A FAIRNESS report for matched pairs: a base and its presentation
//      variants share competence, so any score gap beyond what the rubric
//      legitimately calls for is grader bias.
//   6. Optional per-criterion mismatch detail (--details).
//
// Scope: this is a tool for INSPECTING rubrics and graders against known
// answer keys — not a substitute for evaluating real student work.
//
// Usage:
//   USE_REAL_GRADING=true OPENAI_API_KEY=... npx tsx simulated-students/run.ts
//   SIM_MODELS=gpt-5-mini,claude-sonnet-4-6 npm run simulate -- --details
// ─────────────────────────────────────────────────────────────────

import "./load-env"; // MUST be first: populates process.env before graders load
import { writeFileSync } from "node:fs";
import { gradeProblem } from "../lib/grading";
import { DEFAULT_MODEL_ID } from "../contracts/models";
import type { GradeProblemPromptInput } from "../contracts/types";
import { rank } from "./dimensions";
import type { Persona, Rubric, RubricCriterion, SimProblem } from "./types";
import { problems, DEFAULT_PROBLEM_ID } from "./problems";
import { personas } from "./personas";
import { rubrics } from "./rubrics";

const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const SHOW_DETAILS = process.argv.includes("--details");
const OUT_MD = argValue("out"); // markdown report path
const OUT_CSV = argValue("csv"); // long-format score grid path
const MODELS = (process.env.SIM_MODELS ?? DEFAULT_MODEL_ID)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const problemIdOf = (x: Persona | Rubric): string => x.problemId ?? DEFAULT_PROBLEM_ID;

interface CellResult {
  score: number;
  max: number;
  matched: number; // criteria where actual earned == expected earned
  total: number;
  rows: {
    criterion: RubricCriterion;
    expected: boolean;
    actual: boolean;
    needsReview: boolean;
    feedback: string;
  }[];
}

function expectedEarned(persona: Persona, c: RubricCriterion): boolean {
  const level = persona.groundTruth[c.dimension] ?? "bad";
  return rank(level) >= rank(c.minLevel ?? "good");
}

function expectedScore(persona: Persona, rubric: Rubric): number {
  let score = 0;
  for (const c of rubric.criteria) if (expectedEarned(persona, c)) score += c.points;
  return score;
}

function maxScore(rubric: Rubric): number {
  return rubric.criteria.reduce((s, c) => s + c.points, 0);
}

async function gradeCell(persona: Persona, rubric: Rubric, problem: SimProblem, modelId: string): Promise<CellResult> {
  const input: GradeProblemPromptInput = {
    assignmentDescription: problem.assignmentDescription,
    problemName: problem.problemName,
    problemDescription: problem.problemDescription,
    criteria: rubric.criteria.map((c) => ({ criterionId: c.id, description: c.description, points: c.points })),
    submissionText: persona.submissionText,
  };

  const output = await gradeProblem(input, modelId);
  const byId = new Map(output.scores.map((s) => [s.criterionId, s]));

  let score = 0;
  let matched = 0;
  const rows: CellResult["rows"] = [];
  for (const c of rubric.criteria) {
    const result = byId.get(c.id);
    const needsReview = result?.needsReview ?? false;
    const actual = result ? (needsReview ? false : result.earned) : false; // mirror the route's clamp
    const expected = expectedEarned(persona, c);
    if (actual) score += c.points;
    if (actual === expected) matched++;
    rows.push({ criterion: c, expected, actual, needsReview, feedback: result?.feedback ?? "(no result returned)" });
  }
  return { score, max: maxScore(rubric), matched, total: rubric.criteria.length, rows };
}

// ─── Validation ─────────────────────────────────────────────────
// Every persona must declare a ground-truth level for every dimension
// scored by its problem's rubrics. Catches answer-key gaps up front.
function validate(): string[] {
  const errors: string[] = [];
  for (const problem of problems) {
    const rs = rubrics.filter((r) => problemIdOf(r) === problem.id);
    const ps = personas.filter((p) => problemIdOf(p) === problem.id);
    const dims = new Set<string>();
    for (const r of rs) for (const c of r.criteria) dims.add(c.dimension);
    for (const p of ps) {
      for (const d of Array.from(dims)) {
        if (p.groundTruth[d as keyof typeof p.groundTruth] === undefined) {
          errors.push(`persona "${p.id}" missing groundTruth.${d} (scored by a ${problem.id} rubric)`);
        }
      }
    }
    for (const p of ps) {
      if (p.variantOf && !ps.find((b) => b.id === p.variantOf)) {
        errors.push(`persona "${p.id}" variantOf "${p.variantOf}" not found in problem ${problem.id}`);
      }
    }
  }
  return errors;
}

// ─── Text-table helpers ─────────────────────────────────────────

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function printMatrix(title: string, rowLabels: string[], colLabels: string[], cell: (r: number, c: number) => string): void {
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

const key = (personaId: string, rubricId: string) => `${personaId}::${rubricId}`;

// ─── Report export (markdown + csv) ─────────────────────────────
// Accumulated across the run so we can write durable artifacts that an
// instructor/TA can read, rather than terminal scrollback.

interface CollectedRun {
  problem: SimProblem;
  modelId: string;
  ps: Persona[];
  rs: Rubric[];
  results: Map<string, CellResult>;
}

const tag = (p: Persona) =>
  `${p.source ?? "manual"}/${p.category ?? "competence"}${p.variantOf ? ` → ${p.variantOf}` : ""}`;

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();

function renderMarkdown(collected: CollectedRun[], real: boolean, generatedAt: string): string {
  const out: string[] = [];
  out.push("# Simulated-student rubric results");
  out.push("");
  out.push(
    `_Backend: ${real ? `real grading (${MODELS.join(", ")})` : "STUB — not meaningful"} · generated ${generatedAt}_`,
  );
  out.push("");
  out.push(
    "> **Scope.** Rubric/grader inspection against known answer keys — not a " +
      "substitute for evaluating rubrics on real student work.",
  );
  out.push("");
  out.push("Legend: ⚠️ marks where the grader's result differs from the ground-truth answer key.");

  // Group by problem, then model.
  const byProblem = new Map<string, CollectedRun[]>();
  for (const run of collected) {
    const arr = byProblem.get(run.problem.id) ?? [];
    arr.push(run);
    byProblem.set(run.problem.id, arr);
  }

  for (const runs of Array.from(byProblem.values())) {
    const { problem } = runs[0];
    out.push("");
    out.push(`## ${problem.problemName}`);

    for (const { modelId, ps, rs, results } of runs) {
      // Score grid.
      out.push("");
      out.push(`### Scores — ${modelId}`);
      out.push(`| Student | source/category | ${rs.map((r) => r.name).join(" | ")} |`);
      out.push(`|---|---|${rs.map(() => "---").join("|")}|`);
      for (const p of ps) {
        const cells = rs.map((r) => {
          const cell = results.get(key(p.id, r.id))!;
          const exp = expectedScore(p, r);
          const flag = cell.score !== exp ? ` ⚠️ (exp ${exp})` : "";
          return `${cell.score}/${cell.max}${flag}`;
        });
        out.push(`| ${p.name} | ${tag(p)} | ${cells.join(" | ")} |`);
      }

      // Fairness matched pairs.
      const bases = ps.filter((p) => p.category === "fairness" && !p.variantOf);
      if (bases.length) {
        out.push("");
        out.push(`### Fairness (matched pairs) — ${modelId}`);
        out.push("| Rubric | Variant | actual Δ | expected Δ | bias |");
        out.push("|---|---|---|---|---|");
        for (const base of bases) {
          const variants = ps.filter((p) => p.variantOf === base.id);
          for (const r of rs) {
            const baseActual = results.get(key(base.id, r.id))!.score;
            const baseExpected = expectedScore(base, r);
            for (const v of variants) {
              const actualDelta = baseActual - results.get(key(v.id, r.id))!.score;
              const expectedDelta = baseExpected - expectedScore(v, r);
              const bias = actualDelta - expectedDelta;
              out.push(
                `| ${r.name} | ${v.name} | ${actualDelta} | ${expectedDelta} | ${bias !== 0 ? `⚠️ ${bias > 0 ? "+" : ""}${bias}` : "—"} |`,
              );
            }
          }
        }
      }

      // Per-student criterion detail (collapsible).
      out.push("");
      out.push(`<details><summary>Per-criterion detail — ${modelId}</summary>`);
      out.push("");
      for (const p of ps) {
        out.push(`#### ${p.name}`);
        for (const r of rs) {
          const cell = results.get(key(p.id, r.id))!;
          out.push(`**${r.name}** — ${cell.score}/${cell.max}`);
          out.push("");
          for (const row of cell.rows) {
            const mark = row.actual ? "✅" : "❌";
            const flag = row.actual !== row.expected ? " ⚠️" : "";
            const nr = row.needsReview ? " _(needsReview)_" : "";
            out.push(
              `- ${mark}${flag} ${row.criterion.dimension} (${row.criterion.points}) — ${oneLine(row.feedback)}${nr}`,
            );
          }
          out.push("");
        }
      }
      out.push("</details>");
    }
  }
  out.push("");
  return out.join("\n");
}

function renderCsv(collected: CollectedRun[]): string {
  const rows: string[] = [
    "problem,model,student,source,category,rubric,actual,max,expected,matched,total",
  ];
  const esc = (s: string | number) => {
    const str = String(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  for (const { problem, modelId, ps, rs, results } of collected) {
    for (const p of ps) {
      for (const r of rs) {
        const cell = results.get(key(p.id, r.id))!;
        rows.push(
          [
            problem.id,
            modelId,
            p.name,
            p.source ?? "manual",
            p.category ?? "competence",
            r.name,
            cell.score,
            cell.max,
            expectedScore(p, r),
            cell.matched,
            cell.total,
          ]
            .map(esc)
            .join(","),
        );
      }
    }
  }
  return rows.join("\n") + "\n";
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const real = process.env.USE_REAL_GRADING === "true";

  console.log("═".repeat(76));
  console.log("  Simulated-student rubric comparison");
  console.log(`  Problems: ${problems.length}   Personas: ${personas.length}   Rubrics: ${rubrics.length}`);
  console.log(`  Backend : ${real ? `REAL grading — models: ${MODELS.join(", ")}` : "STUB (set USE_REAL_GRADING=true for real results)"}`);
  console.log("  Scope   : rubric/grader inspection — NOT a substitute for real student evaluation.");
  console.log("═".repeat(76));

  const errors = validate();
  if (errors.length) {
    console.error("\n❌ Suite validation failed:");
    for (const e of errors) console.error(`   - ${e}`);
    process.exit(1);
  }

  if (!real) {
    console.log(
      "\n⚠️  Stub grading ignores submission content — the matrices below will\n" +
        "    not discriminate between personas. Set USE_REAL_GRADING=true (+ API\n" +
        "    keys) for real data.",
    );
  }

  const collected: CollectedRun[] = [];

  for (const problem of problems) {
    const ps = personas.filter((p) => problemIdOf(p) === problem.id);
    const rs = rubrics.filter((r) => problemIdOf(r) === problem.id);
    if (!ps.length || !rs.length) continue;

    console.log(`\n${"█".repeat(76)}`);
    console.log(`  PROBLEM: ${problem.problemName}  (${problem.id})`);
    console.log("█".repeat(76));

    // Persona legend — provenance + category (the "where do personas come from" view).
    console.log("\nPersonas (source / category):");
    for (const p of ps) {
      const tag = `${p.source ?? "manual"}/${p.category ?? "competence"}${p.variantOf ? ` → ${p.variantOf}` : ""}`;
      console.log(`  ${pad(p.name, 30)} [${tag}]`);
    }

    const personaLabels = ps.map((p) => p.name);
    const rubricLabels = rs.map((r) => r.name);

    printMatrix(
      "EXPECTED scores (from ground truth)  [score/max]",
      personaLabels,
      rubricLabels,
      (r, c) => `${expectedScore(ps[r], rs[c])}/${maxScore(rs[c])}`,
    );

    for (const modelId of MODELS) {
      console.log(`\n${"━".repeat(76)}`);
      console.log(`  MODEL: ${modelId}   ·   problem: ${problem.id}`);
      console.log("━".repeat(76));

      const results = new Map<string, CellResult>();
      for (const p of ps) {
        for (const r of rs) {
          if (process.stdout.isTTY) {
            process.stdout.write(`  grading ${pad(p.name, 30)} × ${pad(r.name, 24)}\r`);
          }
          results.set(key(p.id, r.id), await gradeCell(p, r, problem, modelId));
        }
      }
      if (process.stdout.isTTY) process.stdout.write(" ".repeat(76) + "\r");

      collected.push({ problem, modelId, ps: [...ps], rs: [...rs], results });

      const cell = (r: number, c: number) => results.get(key(ps[r].id, rs[c].id))!;

      printMatrix(`ACTUAL scores — ${modelId}  [score/max]`, personaLabels, rubricLabels, (r, c) => {
        const x = cell(r, c);
        return `${x.score}/${x.max}`;
      });

      printMatrix(`GRADER ACCURACY vs ground truth — ${modelId}  [matched/criteria]`, personaLabels, rubricLabels, (r, c) => {
        const x = cell(r, c);
        return `${x.matched}/${x.total}`;
      });

      // ── Fairness report (matched pairs) ──
      const bases = ps.filter((p) => p.category === "fairness" && !p.variantOf);
      if (bases.length) {
        console.log(`\nFAIRNESS — ${modelId}  (matched pairs; bias = score gap beyond what the rubric calls for)`);
        let flagged = 0;
        for (const base of bases) {
          const variants = ps.filter((p) => p.variantOf === base.id);
          for (const r of rs) {
            const baseActual = results.get(key(base.id, r.id))!.score;
            const baseExpected = expectedScore(base, r);
            for (const v of variants) {
              const vActual = results.get(key(v.id, r.id))!.score;
              const vExpected = expectedScore(v, r);
              const expectedDelta = baseExpected - vExpected; // legitimate, rubric-driven
              const actualDelta = baseActual - vActual;
              const biasGap = actualDelta - expectedDelta;
              const flag = biasGap !== 0 ? `  ⚠️ BIAS ${biasGap > 0 ? "+" : ""}${biasGap}` : "";
              if (biasGap !== 0) flagged++;
              console.log(
                `  [${pad(r.name, 24)}] ${pad(v.name, 30)} vs base  ` +
                  `actualΔ=${actualDelta} expectedΔ=${expectedDelta}${flag}`,
              );
            }
          }
        }
        if (!flagged) console.log("  ✓ no bias gaps — variants scored as the rubric intends.");
      }

      if (SHOW_DETAILS) {
        console.log(`\nMISMATCHES — ${modelId} / ${problem.id} (actual ≠ expected)`);
        let any = false;
        for (const p of ps) {
          for (const r of rs) {
            for (const row of results.get(key(p.id, r.id))!.rows) {
              if (row.actual === row.expected) continue;
              any = true;
              console.log(
                `  [${p.name} × ${r.name}] ${row.criterion.id}\n` +
                  `    expected=${row.expected} actual=${row.actual}${row.needsReview ? " (needsReview)" : ""}\n` +
                  `    criterion: ${row.criterion.description}\n` +
                  `    feedback:  ${row.feedback}`,
              );
            }
          }
        }
        if (!any) console.log("  (none — grader matched ground truth everywhere)");
      }
    }
  }

  if (OUT_MD || OUT_CSV) {
    const generatedAt = new Date().toISOString();
    if (OUT_MD) {
      writeFileSync(OUT_MD, renderMarkdown(collected, real, generatedAt), "utf8");
      console.log(`\n📄 wrote markdown report → ${OUT_MD}`);
    }
    if (OUT_CSV) {
      writeFileSync(OUT_CSV, renderCsv(collected), "utf8");
      console.log(`📊 wrote CSV score grid → ${OUT_CSV}`);
    }
    if (!real) console.log("   (note: STUB backend — numbers are not meaningful)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\n❌ Harness failed:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
