# Simulated students

A systematic suite of synthetic student submissions for **inspecting rubrics
and graders**. Each "student" is a deliberately-constructed submission with a
known answer key, so we can grade it with the real LLM pipeline and measure
how faithfully each rubric — and each model — reflects the truth.

> **Scope.** This suite is for *rubric and grader inspection* — checking what
> a rubric rewards and where a grader is biased, against known ground truth.
> It is **not** a substitute for evaluating a rubric on real student work; it
> complements that by isolating effects you can't easily disentangle in the
> wild.

## The idea

A submission varies along several **independent dimensions**. A simulated
student is a chosen point in that space plus the concrete submission that
realizes it. Two kinds of dimension:

- **Competence** — what the work demonstrates (correctness, efficiency, …).
- **Presentation** — *how* it's expressed (language fluency, accessibility),
  decoupled from competence.

The diagnostic personas hold every dimension at `good` and flip exactly **one**
to `bad`/`partial`, so each probes a single rubric behavior or grader bias.

### Dimensions (`dimensions.ts`)

| Dimension | Kind | What it measures |
|---|---|---|
| `correctness` | competence | Does the logic actually solve the problem? |
| `execution` | competence | Does the code run (no syntax/runtime errors)? |
| `efficiency` | competence | Is the complexity optimal? (here: O(n)) |
| `completeness` | competence | Edge cases: empty string, index 0, all-repeat |
| `simplicity` | competence | Appropriately simple, no needless abstraction |
| `readability` | competence | Naming, formatting, PEP-8 |
| `explanation` | competence | Comments / docstring explaining the approach |
| `language_fluency` | presentation | Native vs non-native / ESL phrasing |
| `accessibility` | presentation | Plain-text, screen-reader-friendly form |

Uniform 3-level scale: `good` > `partial` > `bad`.

## Problems (`problems/`)

| Problem | Type | One line |
|---|---|---|
| `first-non-repeating-char` | coding | Index of the first non-repeating character; optimal O(n). |
| `explain-overfitting` | short-answer | Free-text ML concept question — where linguistic bias bites hardest. |

Personas and rubrics belong to a problem via `problemId` (omitted = the CS1
default). The harness produces one set of matrices per problem.

## Personas (`personas/`)

Each persona declares a `source` (provenance), a `category`, and — for
fairness variants — a `variantOf` link.

**Competence (CS1):** Perfect Student (ceiling), Logic Master w/ Bad Syntax
(`execution`), Clean Coder w/ Wrong Logic (`correctness` — readability bias),
Brute Forcer (`efficiency`), Off-by-One Victim (partial — partial credit),
Over-Complicator (`simplicity`), Empty Submission (floor).

**Fairness matched pairs:** a base correct submission + variants that differ
**only in presentation** — so a fair rubric/grader must score them the same.
- CS1: `fairness-base-cs1` + ESL variant + accessibility variant.
- Short-answer: `sa-correct-native` + ESL variant, plus `sa-incomplete`
  (no mitigation) and `sa-wrong` (confident-but-wrong) competence cases.

## Rubrics (`rubrics/`)

Each criterion is tagged with the `dimension` it measures + a `minLevel`
(default `good`), so the harness computes the **expected** outcome from ground
truth and compares it to the grader.

- **CS1:** Output-Only · Correctness + Efficiency · Comprehensive.
- **Short-answer:** SA Content (concept/mechanism/mitigation only) · SA
  Content + Writing (the same, plus a writing criterion — *deliberately*
  imports a language penalty into a concept question).

The pairing is the point: under **SA Content** the native and ESL answers
should score identically (any gap = grader bias); under **SA Content +
Writing** the ESL answer loses the writing points *by design* (a rubric
effect, not bias). The fairness report separates the two.

## Running it

```bash
# Real grading (recommended — the stub ignores submission content):
#   put OPENAI_API_KEY / ANTHROPIC_API_KEY (+ USE_REAL_GRADING=true) in
#   .env.local (auto-loaded), then:
npm run simulate

# Inline, multiple models, per-criterion mismatch detail:
USE_REAL_GRADING=true SIM_MODELS=gpt-5-mini,claude-sonnet-4-6 npm run simulate -- --details
```

Per problem the harness prints: a persona legend (source/category), an
EXPECTED matrix, an ACTUAL matrix per model, grader accuracy vs ground truth,
and a **fairness report** flagging any score gap between matched-pair variants
beyond what the rubric legitimately calls for.

### Saving results (for TAs / the paper)

Terminal output is ephemeral; write durable artifacts with:

```bash
npm run simulate -- --out results.md --csv results.csv
```

- **`--out <file.md>`** — a Markdown report (easiest to read): a per-problem
  score grid with ⚠️ flags where the grader disagrees with the answer key, the
  fairness matched-pair table, and a collapsible per-criterion breakdown with
  the grader's feedback. Renders on GitHub / VS Code / Notion.
- **`--csv <file.csv>`** — a long-format score grid
  (`problem,model,student,…,actual,max,expected,…`) for pivoting in a
  spreadsheet.

## Authoring & co-designing personas

Three workflows, mirroring how an instructor would actually build them:

1. **Manual.** Copy `personas/_template.ts`, fill `groundTruth` + the
   submission, register it in `personas/index.ts`. The harness validates that
   every persona covers the dimensions its problem's rubrics score.
2. **Revise a system-generated draft.** `generate.ts` drafts a persona (and a
   *proposed* ground-truth) with an LLM for you to check and edit:
   ```bash
   npm run simulate:generate -- --mode failure --dimension efficiency --write
   ```
   Output lands in `personas/generated/` tagged `source: "generated"`. Review
   the answer key and submission, then register it.
3. **From historical mistakes.** Seed a persona from an error seen in a prior
   offering:
   ```bash
   npm run simulate:generate -- --mode historical \
     --mistake "students forget the empty-string case" --write
   ```
   Tagged `source: "historical"`. (Use `--mock` to scaffold a placeholder
   without calling an LLM; `--model <id>` to choose the model.)

In every case the LLM *drafts*, the instructor *decides* — generation is a
co-design starting point, not an authority on the answer key.

## Adding a rubric or problem

- **Rubric:** add a file in `rubrics/`, tag each criterion with its
  `dimension` (+ optional `minLevel`) and `problemId`, list it in
  `rubrics/index.ts`.
- **Problem:** add a file in `problems/`, register it in `problems/index.ts`,
  then add personas + rubrics that reference its `id`.
