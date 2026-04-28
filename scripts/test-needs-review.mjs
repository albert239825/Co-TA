/**
 * E2E script: tests whether real grading emits needsReview on ambiguous criteria.
 *
 * Prerequisites: dev server running on localhost:3000 with USE_REAL_GRADING=true
 *
 * Usage: node scripts/test-needs-review.mjs
 */

const BASE = "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function poll(path, until, intervalMs = 1000, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await get(path);
    if (until(data)) return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out polling ${path}`);
}

// ─── Assignment designed to trigger needsReview ──────────────
const ASSIGNMENT = {
  name: "[TEST] needsReview trigger",
  description: "Write a Python function that returns the factorial of n using recursion.",
  problems: [
    {
      name: "Factorial",
      description: "Implement factorial(n) recursively.",
      sortOrder: 1,
      criteria: [
        {
          description: "Correct base case (n == 0 or n == 1 returns 1)",
          points: 3,
          sortOrder: 1,
        },
        {
          description: "Correct recursive call",
          points: 4,
          sortOrder: 2,
        },
        {
          // Intentionally vague — designed to trigger needsReview
          description: "Student demonstrates clear understanding of why recursion terminates (explanation or comment required)",
          points: 3,
          sortOrder: 3,
        },
      ],
    },
  ],
};

// Ambiguous submission: has a comment but it's vague/incomplete —
// not clearly wrong, but doesn't fully explain termination.
// Also uses an unusual recursive structure that's technically correct
// but the model may be uncertain whether it qualifies.
const SUBMISSION_CONTENT = `
def factorial(n):
    # stop when small
    if n <= 1:
        return 1
    return n * factorial(n - 1)
`.trim();

const MODELS = ["gpt-5-mini", "gpt-5.3", "claude-sonnet-4-6", "claude-opus-4-7"];

async function testModel(modelId) {
  console.log(`\n${"═".repeat(52)}`);
  console.log(`  Model: ${modelId}`);
  console.log(`${"═".repeat(52)}`);

  const assignment = await post("/api/assignments", {
    ...ASSIGNMENT,
    name: `[TEST] needsReview — ${modelId}`,
  });
  console.log(`  assignment: ${assignment.id}`);

  const [submission] = await post("/api/submissions", {
    assignmentId: assignment.id,
    files: [{ studentIdentifier: "test.student", fileName: "factorial.py", fileContent: SUBMISSION_CONTENT }],
  });

  await post("/api/grade/batch", {
    assignmentId: assignment.id,
    submissionIds: [submission.id],
    modelId,
  });

  const graded = await poll(
    `/api/submissions/${submission.id}`,
    (s) => s.status === "graded" || s.status === "reviewed",
    1500,
    90000
  );

  let flagCount = 0;
  for (const problem of graded.gradingResult.problems) {
    for (const c of problem.criteria) {
      const flag = c.needsReview ? "🚩 NEEDS REVIEW" : c.earned ? "✅ earned" : "❌ not earned";
      console.log(`  [${flag}]`);
      console.log(`    criterion: ${c.description}`);
      console.log(`    feedback:  ${c.aiFeedback}`);
      if (c.needsReview) flagCount++;
    }
  }

  console.log(`\n  → ${flagCount} criterion/criteria flagged needsReview`);
  return flagCount;
}

(async () => {
  const results = [];
  for (const modelId of MODELS) {
    try {
      const flagged = await testModel(modelId);
      results.push({ modelId, flagged, error: null });
    } catch (err) {
      console.error(`  ❌ ${modelId} failed: ${err.message}`);
      results.push({ modelId, flagged: 0, error: err.message });
    }
  }

  console.log(`\n${"═".repeat(52)}`);
  console.log("  Summary");
  console.log(`${"═".repeat(52)}`);
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.modelId.padEnd(22)} ❌  ${r.error.slice(0, 40)}`);
    } else {
      const bar = r.flagged > 0 ? "🚩".repeat(r.flagged) : "—";
      console.log(`  ${r.modelId.padEnd(22)} ${bar}  (${r.flagged} flagged)`);
    }
  }
})().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
