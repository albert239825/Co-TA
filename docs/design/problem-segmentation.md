# Design: Segmenting Submissions by Problem

**Status:** Proposal — not yet implemented
**Author:** Devin (roadmap bonus work, overnight session)
**Related:** `contracts/types.ts`, `src/app/api/grade/batch/route.ts`, `lib/graders/`

---

## 1. Problem statement

Right now, when we grade an assignment with N problems, we call the LLM
N times per submission. Each call carries:

- the one problem's description and rubric criteria, **and**
- the **entire** submission text.

See <ref_snippet file="src/app/api/grade/batch/route.ts" lines="233-246" />.

That's wasteful and error-prone:

1. **Token cost scales with N.** A 10-page submission with 5 problems
   pays for the full 10 pages × 5 grader calls ≈ 50 pages of context,
   even though each problem only needs its own section. At current
   Sonnet pricing ($3/MTok input), a single 20-page multi-problem
   submission can cost several cents to grade. Across a 200-student
   course that adds up.
2. **Attention dilution.** The LLM is asked to grade Problem 3 while
   staring at all of Problems 1–5. Even frontier models leak: criteria
   for P3 sometimes get "credit" from work that was actually for P2.
   This is the most common class of stub/real-model disagreement we see
   in practice.
3. **Feedback bleed.** The per-criterion feedback field occasionally
   references "your answer to Problem 2", which is confusing UX on the
   Problem 3 review pane.

We want to send the LLM **only the part of the submission that
corresponds to the problem currently being graded** — and fall back
gracefully when segmentation is ambiguous.

## 2. Goals

- G1 — Reduce average input tokens per grade run by ≥ 50% on
  multi-problem assignments.
- G2 — Improve `needsReview` precision by removing cross-problem
  attention leaks. (Measured against a small human-labelled eval set
  we'd stand up during rollout.)
- G3 — Keep the grader API (`GradeProblemPromptInput.submissionText`)
  the same. Segmentation is an upstream concern.
- G4 — Never silently drop submission content. If segmentation is
  uncertain, fall back to the current "send everything" behaviour and
  surface a warning on the triage view.

## 3. Non-goals

- Grading multiple problems in one LLM call (batching). Orthogonal,
  and arguably harder to get right — deferring.
- OCR / image-only PDFs. Tracked separately in the file-format PR.
- Teaching TAs to write problem-aware rubrics. Rubric structure is
  already per-problem; we just need to find the matching region in the
  submission.

## 4. Current state (as of this doc)

```
for each submission:
  1. pull submission.fileContent  (one blob of text)
  2. for each problem in assignment.problems:
       call gradeProblem({
         problemName,
         problemDescription,
         criteria,
         submissionText: <entire blob>,   ← the wasteful part
       })
```

`submission.fileContent` is plain text after PR #17's extraction (PDF/
DOCX → text). The grader assumes the submission is monolithic.

## 5. Approaches considered

### 5A. Header-regex segmenter (deterministic)

Scan for canonical problem headers in the submission text. On hit,
slice the text between consecutive headers and assign each slice to
the matching problem.

Heuristic header patterns (ordered by priority):

1. `^\s*Problem\s+(\d+|[IVX]+)[.:)]?` (most common in engineering
   courses)
2. `^\s*#{1,3}\s*(Problem|Question|Q|Part)\s+(\d+)` (markdown)
3. `^\s*(Problem|Question|Q|Part)\s+(\d+)[\.:)]?\s*$` (standalone line)
4. Exact rubric problem name (e.g. `"Problem 3: DFS"`) — matched
   against `problem.name` from the rubric.

**Pros**
- Deterministic. Reproducible. Free.
- Debuggable: we can render the detected segment boundaries in the UI
  and let TAs correct them.
- Works well for the 80% case where students follow course
  conventions.

**Cons**
- Hopelessly fragile on PDF-extracted text where line breaks and
  headers are scrambled. Even a clean `.docx` can emit "Problem1"
  without a space if the source used a tab-rendered style.
- Handwritten / scanned PDFs have no headers at all.
- No generalisation — every department has different conventions.

**Expected coverage:** 60–70% of submissions on a typical CS course.

### 5B. LLM-based segmenter (single-shot)

Before the grader calls, do one extra LLM call per submission:

> "Given the following submission text and this list of problems
> (`[P1: name, P1: description, ...]`), return a JSON mapping of
> problem id → (start, end) character offsets into the submission. If
> a problem has no identifiable section, set that problem to null."

The grader then slices the text by offsets.

**Pros**
- Handles messy real-world submissions (missing headers, reorderings,
  mixed formats).
- Works cross-language and cross-format.
- Cheap relative to the grading itself: one extra call that sees the
  submission once vs. N calls that each see it fully.

**Cons**
- Non-deterministic. Tests become flakier.
- Can hallucinate segment boundaries. Must validate offsets are
  non-overlapping and within bounds.
- Extra latency (~1 round-trip, typically 1–3s on modern models).
- Cost scales with submission length.

**Expected coverage:** 90%+ on messy submissions, modulo hallucination.

### 5C. Explicit headers mandated by the rubric

Add a "separator" field to the rubric builder: the TA types the
literal string they'll tell students to use ("=== Problem {n} ===")
and the upload path splits on that.

**Pros**
- Zero ambiguity when followed.
- Zero LLM cost.
- Clear contract with students.

**Cons**
- Requires a workflow change from the TA/professor side. Many won't
  adopt, and we can't enforce what's in the submission.
- Breaks for prose-heavy submissions where verbatim separators feel
  unnatural.
- Still needs a fallback when students forget.

**Expected coverage:** ~100% of compliant submissions, ~0% of the rest.

### 5D. Per-problem embedding retrieval

Chunk the submission (e.g. per paragraph), embed each chunk, embed each
problem description, and pick the top-k chunks per problem by cosine
similarity.

**Pros**
- Robust to reordering and missing headers.
- Graceful degradation — always returns _something_, just less focused.

**Cons**
- Adds an embeddings provider dependency (new auth surface, new
  failure mode).
- Tuning k / paragraph length is a science experiment.
- Can assign the same paragraph to multiple problems, which changes
  the "no content repeated" invariant.
- Feels over-engineered for the current scale.

**Expected coverage:** high, but harder to reason about and debug.

## 6. Recommended approach: 5A + 5B with explicit fallback

Staged, with the deterministic path as the primary and the LLM path as
the fallback. Concretely:

```
segmentSubmission(submission, problems) → SegmentationResult
  1. Try header-regex segmenter (5A).
     - If it produces one non-empty slice per problem and the slices
       cover ≥ 70% of the submission text, return
       { strategy: "regex", segments, coverage }.
  2. Otherwise, call LLM segmenter (5B).
     - If the model returns valid non-overlapping offsets for all
       problems, return { strategy: "llm", segments, coverage }.
  3. Otherwise, fall back to the current behaviour:
     return { strategy: "none", segments: <full text per problem>,
              warning: "segmentation failed, graded against full
                        submission" }.
```

Then the grader loop becomes:

```
for each problem in assignment.problems:
  call gradeProblem({
    ...,
    submissionText: segments[problem.id] ?? submission.fileContent,
  })
```

Why this ordering:
- Deterministic first, so most submissions stay reproducible and free.
- LLM fallback handles the messy cases.
- "No segmentation" fallback is always safe and preserves current
  behaviour. We never grade on less-than-full context unless we're
  confident.

## 7. Contract changes

### 7.1 New type (add to `contracts/types.ts`)

```typescript
export type SegmentationStrategy = "regex" | "llm" | "none";

export interface SegmentationResult {
  strategy: SegmentationStrategy;
  /** Map from problemId → submission text for that problem. */
  segments: Record<string, string>;
  /** Fraction of submission text covered by segments ∈ [0, 1]. */
  coverage: number;
  /** Surfaced to the TA when strategy === "none" or coverage is low. */
  warning: string | null;
}
```

### 7.2 Schema

Add one column to `grading_results`:

```sql
ALTER TABLE grading_results ADD COLUMN segmentation_strategy TEXT;
```

Values: `"regex"`, `"llm"`, `"none"`. Drizzle side uses a text column
with a runtime guard. We surface this on the triage view as an icon
tooltip: "Graded with LLM-segmented context" / "Graded with full
submission (segmentation failed)".

### 7.3 `GradeProblemPromptInput` — no change

The grader stays model-agnostic. Segmentation is a caller concern,
which keeps the `lib/graders/` surface small.

## 8. Implementation sketch

```
lib/segmentation/
├── index.ts          // segmentSubmission(submission, problems)
├── regex.ts          // 5A — header-regex segmenter
├── llm.ts            // 5B — LLM-backed segmenter (dynamic import of
│                     //       the dispatcher, same precedence rules
│                     //       as grading)
├── prompts.ts        // system + user prompt templates for 5B
└── types.ts          // SegmentationResult (re-exports from contracts)
```

Wire point: `src/app/api/grade/batch/route.ts` lines 233–246. Replace
the loop with:

```typescript
const segmentation = await segmentSubmission(
  submission,
  problemsWithCriteria,
  { modelId: resolvedModelId }
);

for (const problem of problemsWithCriteria) {
  const promptInput: GradeProblemPromptInput = {
    // ... same as before ...
    submissionText:
      segmentation.segments[problem.id] ?? submission.fileContent,
  };
  const output = await gradeProblem(promptInput, resolvedModelId);
  // ... collect results ...
}

// Persist strategy on the grading_result so the UI can render it.
```

## 9. Testing plan

- Unit: golden files for the regex segmenter covering markdown,
  `Problem 1.`, `Q1)`, Roman numerals, and the two or three edge cases
  we've seen in real submissions.
- Unit: segmenter falls back to "none" when input has no identifiable
  structure.
- Integration: mock the LLM segmenter to return known offsets and
  verify the grading loop receives the right slices.
- Eval harness (new, lightweight): a small directory of real
  submissions with hand-labelled ground-truth segments. We measure
  coverage accuracy and regress on it nightly.

## 10. Rollout

1. Ship behind a feature flag: `SEGMENTATION_STRATEGY=off|regex|auto`
   (auto = 5A + 5B). Default `off` for the first release.
2. A/B on a subset of assignments: flip one or two courses to `auto`,
   measure `needsReview` rate + TA override rate + subjective quality.
3. Default to `auto` once the eval harness shows ≥ 70% coverage on
   real courseware.
4. Long-tail work: teach the rubric builder to suggest header
   conventions to TAs ("Your students saw good results when they used
   `Problem N.` headers").

## 11. Open questions

- **Q1.** Should the LLM segmenter always use the assignment's chosen
  model, or pin to a fast/cheap default (e.g. Haiku) regardless of the
  grader choice? Arg for pin: segmentation is easier than grading, so
  we can save cost. Arg against: extra moving parts.
- **Q2.** Do we expose segmented text in the review UI? Could be
  useful for TAs ("this is the part of the submission the model
  looked at") but doubles the review surface.
- **Q3.** When the regex segmenter finds 4 of 5 problems, do we use
  the 4 hits + full-submission fallback for the 5th, or abandon and
  go full-submission for everyone? Recommending the former —
  partial wins are still wins.
- **Q4.** Segmentation results are not currently cache-keyed. If a TA
  re-grades, we re-segment. Cheap enough today, but consider caching
  by `submissionId × problemSet.hash`.

## 12. Estimated effort

- Regex segmenter + tests: ~0.5 day
- LLM segmenter + prompts: ~0.5 day
- Dispatcher + fallback logic: ~0.25 day
- Schema migration + UI badge: ~0.25 day
- Eval harness (minimal): ~0.5 day
- Feature flag + gradual rollout: ~0.25 day

Total: ~2 engineer-days, plus ~1 day of eval curation that should
happen in parallel.

## 13. Decision needed from product

Pick one of:

- **(a) Build this as specced above** (5A + 5B + fallback).
- **(b) Build only the deterministic regex path (5A)** and punt on the
  LLM fallback. Cheaper, but expected coverage drops to 60–70%.
- **(c) Defer entirely** and rely on (5C) — mandate explicit headers
  in assignment descriptions and let students self-segment. No code
  cost, highest UX friction.

Default recommendation: **(a)**. The LLM fallback is cheap to build on
top of the existing grader framework (PR #16) and the payoff on token
cost + grading accuracy is the best of the three options.
