// ─── Persona generator (co-design) ──────────────────────────────
//
// Drafts a simulated-student persona with an LLM so an instructor can
// REVISE it rather than write from scratch. Two modes back the paper's
// authoring story:
//
//   --mode failure   --dimension <id> [--level bad|partial]
//       A submission that is good on every dimension except the target
//       one. (source: "generated")
//
//   --mode historical --mistake "students forget the empty-string case"
//       A submission that reproduces a mistake seen in a prior offering.
//       (source: "historical")
//
// The model also PROPOSES a ground-truth vector; the instructor is meant
// to check and edit it. Output is a ready-to-edit persona file.
//
// Usage:
//   USE_REAL_GRADING-style keys required (OPENAI_API_KEY / ANTHROPIC_API_KEY):
//     OPENAI_API_KEY=... npx tsx simulated-students/generate.ts \
//       --mode failure --dimension efficiency --write
//     npx tsx simulated-students/generate.ts \
//       --mode historical --mistake "off-by-one on the last index" --problem first-non-repeating-char
//   --write   write the file under personas/generated/ (else print to stdout)
//   --model   model id from the registry (default: gpt-5-mini)
//   --mock    emit a deterministic placeholder without calling any LLM
// ─────────────────────────────────────────────────────────────────

import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getModelById, DEFAULT_MODEL_ID } from "../contracts/models";
import { DIMENSIONS, type DimensionId, type Level } from "./dimensions";
import { problems, DEFAULT_PROBLEM_ID, getProblem } from "./problems";
import type { PersonaSource } from "./types";

// ─── arg parsing ────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const mode = (arg("mode") ?? "failure") as "failure" | "historical";
const problemId = arg("problem") ?? DEFAULT_PROBLEM_ID;
const dimension = arg("dimension") as DimensionId | undefined;
const level = (arg("level") ?? "bad") as Level;
const mistake = arg("mistake");
const modelId = arg("model") ?? DEFAULT_MODEL_ID;
const WRITE = flag("write");
const MOCK = flag("mock");

// ─── generation schema ──────────────────────────────────────────

interface GeneratedPersona {
  id: string;
  name: string;
  summary: string;
  submissionText: string;
  groundTruth: Partial<Record<DimensionId, Level>>;
}

function buildPrompt(problemDesc: string): { system: string; user: string } {
  const dimCatalog = DIMENSIONS.map(
    (d) => `- ${d.id}: ${d.description} (good=${d.levels.good} | partial=${d.levels.partial} | bad=${d.levels.bad})`,
  ).join("\n");

  const target =
    mode === "failure"
      ? `Create a submission that is GOOD on every quality dimension EXCEPT "${dimension}", which must be "${level}". Realize that flaw concretely and naturally in the submission — do not announce it.`
      : `Create a submission that reproduces this mistake commonly seen in a prior offering of the course:\n"${mistake}"\nThen set groundTruth to reflect the resulting quality profile.`;

  const system =
    "You help an instructor build a SIMULATED student submission used to test " +
    "a grading rubric. Produce a realistic submission with a known quality " +
    "profile. Return ONLY a JSON object — no prose, no code fences.";

  const user = `## Problem
${problemDesc}

## Quality dimensions
${dimCatalog}

## Task
${target}

Return JSON exactly:
{
  "id": "<kebab-case-id>",
  "name": "<short human name>",
  "summary": "<one line: what this persona probes>",
  "submissionText": "<the student's full submission>",
  "groundTruth": { "<dimension>": "good|partial|bad", ... }
}`;
  return { system, user };
}

// ─── model call ─────────────────────────────────────────────────

function stripFence(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text.trim();
}

async function callModel(system: string, user: string): Promise<string> {
  const model = getModelById(modelId);
  if (!model) throw new Error(`Unknown model "${modelId}" — not in the registry.`);

  if (model.provider === "openai") {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();
    const resp = await client.chat.completions.create({
      model: model.id,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return resp.choices[0]?.message?.content ?? "";
  }
  if (model.provider === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: model.id,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    });
    return resp.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
  throw new Error(`Provider "${model.provider}" cannot generate personas.`);
}

// ─── file emission ──────────────────────────────────────────────

const camel = (kebab: string) =>
  kebab.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));

function renderFile(p: GeneratedPersona, source: PersonaSource): string {
  const exportName = camel(p.id) || "generatedPersona";
  const provenance =
    source === "historical"
      ? `// Reproduces a historical mistake: ${JSON.stringify(mistake)}`
      : `// Generated failure-mode persona targeting dimension "${dimension}" = "${level}"`;
  const problemLine = problemId === DEFAULT_PROBLEM_ID ? "" : `\n  problemId: ${JSON.stringify(problemId)},`;
  return `import type { Persona } from "../../types";

// GENERATED by simulated-students/generate.ts — REVIEW and edit before use,
// then register it in personas/index.ts.
${provenance}
export const ${exportName}: Persona = {
  id: ${JSON.stringify(p.id)},
  name: ${JSON.stringify(p.name)},
  summary: ${JSON.stringify(p.summary)},${problemLine}
  source: ${JSON.stringify(source)},
  category: "competence",
  groundTruth: ${JSON.stringify(p.groundTruth, null, 4).replace(/\n/g, "\n  ")},
  submissionText: ${JSON.stringify(p.submissionText)},
};
`;
}

function mockPersona(): GeneratedPersona {
  const gt: Partial<Record<DimensionId, Level>> = {};
  for (const d of DIMENSIONS) gt[d.id] = "good";
  if (mode === "failure" && dimension) gt[dimension] = level;
  return {
    id: mode === "failure" ? `generated-${dimension}-${level}` : "historical-mistake",
    name: mode === "failure" ? `Generated: ${dimension}=${level}` : "Historical mistake",
    summary:
      mode === "failure"
        ? `Placeholder failure-mode persona (dimension ${dimension}). EDIT ME.`
        : `Placeholder for historical mistake: ${mistake}. EDIT ME.`,
    submissionText: "# TODO: --mock placeholder. Replace with a real submission.",
    groundTruth: gt,
  };
}

// ─── main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!getProblem(problemId)) {
    throw new Error(`Unknown problem "${problemId}". Known: ${problems.map((p) => p.id).join(", ")}`);
  }
  if (mode === "failure" && !dimension) throw new Error("--mode failure requires --dimension <id>");
  if (mode === "historical" && !mistake) throw new Error('--mode historical requires --mistake "<text>"');

  const source: PersonaSource = mode === "historical" ? "historical" : "generated";
  const problem = getProblem(problemId)!;

  let persona: GeneratedPersona;
  if (MOCK) {
    persona = mockPersona();
  } else {
    const { system, user } = buildPrompt(problem.problemDescription);
    const raw = await callModel(system, user);
    if (!raw) throw new Error("Model returned empty response.");
    persona = JSON.parse(stripFence(raw)) as GeneratedPersona;
  }

  const file = renderFile(persona, source);

  if (WRITE) {
    const dir = resolve(process.cwd(), "simulated-students/personas/generated");
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${persona.id}.ts`);
    writeFileSync(path, file, "utf8");
    console.log(`✓ wrote ${path}`);
    console.log("  Review the ground truth + submission, then register it in personas/index.ts.");
  } else {
    console.log(file);
    console.log("// (not written — pass --write to save under personas/generated/)");
  }
}

main().catch((err) => {
  console.error("❌ generate failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
