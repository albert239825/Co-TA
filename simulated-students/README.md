# Simulated students

A systematic suite of synthetic student submissions for testing Co-TA's
grading and **comparing rubrics against each other**. Each "student" is a
deliberately-constructed submission with a known answer key, so we can grade
it with the real LLM pipeline and measure how faithfully each rubric — and
each model — reflects the truth.

## The idea

A real submission varies along several **independent quality dimensions**.
A simulated student is a chosen point in that space, plus the concrete code
that realizes it.

The diagnostic personas each hold every dimension at `good` and flip exactly
**one** to `bad`/`partial`. That isolation is what makes them probe a single
rubric behavior or grader bias at a time.

### Quality dimensions (`dimensions.ts`)

| Dimension | What it measures |
|---|---|
| `correctness` | Does the logic actually solve the problem? |
| `execution` | Does the code run (no syntax/runtime errors)? |
| `efficiency` | Is the complexity optimal? (here: O(n)) |
| `completeness` | Edge cases: empty string, index 0, all-repeat |
| `simplicity` | Appropriately simple, no needless abstraction |
| `readability` | Naming, formatting, PEP-8 |
| `explanation` | Comments / docstring explaining the approach |

Each dimension uses a uniform 3-level scale: `good` > `partial` > `bad`.

## The case-study problem (`problems/`)

> **First Non-Repeating Character** — return the index of the first
> non-repeating character in a string, or `-1` if none exists. Optimal
> solution is **O(n)**.

## Personas (`personas/`)

| Persona | Flips to bad/partial | Probes |
|---|---|---|
| Perfect Student | — (all good) | Control / ceiling |
| Logic Master w/ Bad Syntax | `execution` | Conceptual understanding vs. working code |
| Clean Coder w/ Wrong Logic | `correctness`, `completeness` | **Readability bias** |
| Brute Forcer | `efficiency` | Efficiency enforcement |
| Off-by-One Victim | `correctness`/`completeness` (partial) | Granular partial credit |
| Over-Complicator | `simplicity` | Simplicity enforcement |
| Empty Submission | all bad | Floor |

## Rubrics (`rubrics/`)

Three rubrics of increasing rigor — the columns of the results matrix:

1. **Output-Only** — correctness + the no-unique case only.
2. **Correctness + Efficiency** — adds an explicit O(n) criterion.
3. **Comprehensive** — one criterion per quality dimension.

Each criterion is tagged with the `dimension` it measures and a `minLevel`
(default `good`). That lets the harness compute the **expected** outcome from
a persona's ground truth and compare it to what the LLM actually does.

The point of grading the same students under all three: a weak rubric can't
tell good work apart from bad. The Brute Forcer earns full marks under
Output-Only but loses the efficiency points under the other two; the Logic
Master earns full marks under Output-Only but loses execution points under
Comprehensive.

## Running it

The harness grades every persona × rubric and prints an EXPECTED matrix, an
ACTUAL matrix per model, and grader-accuracy-vs-ground-truth.

```bash
# Real grading (recommended — stub ignores submission content):
#   put OPENAI_API_KEY / ANTHROPIC_API_KEY and USE_REAL_GRADING=true in
#   .env.local (auto-loaded), then:
npm run simulate

# Or inline:
USE_REAL_GRADING=true OPENAI_API_KEY=sk-... npm run simulate

# Pick model(s) and show per-criterion mismatches:
SIM_MODELS=gpt-5-mini,claude-sonnet-4-6 npm run simulate -- --details
```

`SIM_MODELS` defaults to the registry default (`gpt-5-mini`). Without
`USE_REAL_GRADING=true` the deterministic stub runs — fine as a smoke test,
but it ignores submission content so the matrix won't discriminate.

## Adding to the suite

- **New persona:** add a file in `personas/`, fill in `groundTruth` for every
  dimension and the `submissionText`, then list it in `personas/index.ts`.
- **New rubric:** add a file in `rubrics/`, tag each criterion with its
  `dimension` (+ optional `minLevel`), then list it in `rubrics/index.ts`.
- **New problem:** add a file in `problems/` and point the harness at it.

To go beyond hand-picked corners, enumerate combinations of dimension levels
and author the code that realizes each — the schema is built to support that.
