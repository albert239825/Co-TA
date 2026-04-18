import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../../../../db";
import * as schema from "../../../../../db/schema";
import { batchGradeRequestSchema, parseBody } from "../../../../../lib/validation";
import { gradeProblem } from "../../../../../lib/grading";
import { emitGradeEvent } from "../../../../../lib/events";
import { computeEffectiveScore } from "../../../../../lib/scores";
import type {
  BatchGradeResponse,
  GradeStreamEvent,
  GradeProblemPromptInput,
  ProblemScoreSummary,
  ApiError,
} from "../../../../../contracts/types";

// ─── POST /api/grade/batch ──────────────────────────────────────
export async function POST(request: Request) {
  try {
    const parsed = await parseBody(request, batchGradeRequestSchema);
    if (parsed.error) return parsed.error;

    const { assignmentId, submissionIds } = parsed.data;

    // Verify assignment exists
    const assignment = db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .get();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    // Get problems + criteria for this assignment (ordered)
    const problems = db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.assignmentId, assignmentId))
      .orderBy(schema.problems.sortOrder)
      .all();

    const problemsWithCriteria = problems.map((prob) => {
      const criteria = db
        .select()
        .from(schema.rubricCriteria)
        .where(eq(schema.rubricCriteria.problemId, prob.id))
        .orderBy(schema.rubricCriteria.sortOrder)
        .all();
      return { ...prob, criteria };
    });

    // Resolve which submissions to grade
    let submissionsToGrade;
    if (submissionIds.length === 0) {
      // Grade all "pending" submissions for this assignment
      submissionsToGrade = db
        .select()
        .from(schema.submissions)
        .where(
          and(
            eq(schema.submissions.assignmentId, assignmentId),
            eq(schema.submissions.status, "pending")
          )
        )
        .all();
    } else {
      submissionsToGrade = db
        .select()
        .from(schema.submissions)
        .where(
          and(
            eq(schema.submissions.assignmentId, assignmentId),
            inArray(schema.submissions.id, submissionIds)
          )
        )
        .all();
    }

    const started = submissionsToGrade.length;
    const streamUrl = `/api/grade/stream?assignmentId=${assignmentId}`;

    // Fire-and-forget: kick off grading in background
    // We don't await this — the client uses SSE to track progress
    gradeSubmissions(assignmentId, submissionsToGrade, problemsWithCriteria);

    return NextResponse.json(
      { started, streamUrl } satisfies BatchGradeResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/grade/batch error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      } satisfies ApiError,
      { status: 500 }
    );
  }
}

// ─── Background grading engine ──────────────────────────────────

interface ProblemWithCriteria {
  id: string;
  assignmentId: string;
  name: string;
  description: string;
  sortOrder: number;
  criteria: {
    id: string;
    problemId: string;
    description: string;
    points: number;
    sortOrder: number;
  }[];
}

interface SubmissionRow {
  id: string;
  assignmentId: string;
  studentIdentifier: string;
  fileName: string;
  fileContent: string;
  status: string;
}

async function gradeSubmissions(
  assignmentId: string,
  submissions: SubmissionRow[],
  problemsWithCriteria: ProblemWithCriteria[]
) {
  // Inline concurrency limiter (replaces p-limit which uses Node.js
  // subpath imports incompatible with Next.js webpack)
  const MAX_CONCURRENT = 5;
  const results: Promise<void>[] = [];
  let active = 0;
  let idx = 0;

  await new Promise<void>((resolveAll) => {
    if (submissions.length === 0) {
      resolveAll();
      return;
    }

    function next() {
      while (active < MAX_CONCURRENT && idx < submissions.length) {
        const submission = submissions[idx++];
        active++;
        const p = gradeOneSubmission(
          assignmentId,
          submission,
          problemsWithCriteria
        ).finally(() => {
          active--;
          if (idx < submissions.length) {
            next();
          } else if (active === 0) {
            resolveAll();
          }
        });
        results.push(p);
      }
    }

    next();
  });

  await Promise.allSettled(results);

  // Emit batch_complete event
  const completeEvent: GradeStreamEvent = {
    type: "batch_complete",
    submissionId: "",
    timestamp: new Date().toISOString(),
  };
  emitGradeEvent(assignmentId, completeEvent);
}

async function gradeOneSubmission(
  assignmentId: string,
  submission: SubmissionRow,
  problemsWithCriteria: ProblemWithCriteria[]
) {
  try {
    // 1. Set status to "grading"
    db.update(schema.submissions)
      .set({ status: "grading", updatedAt: new Date() })
      .where(eq(schema.submissions.id, submission.id))
      .run();

    emitGradeEvent(assignmentId, {
      type: "status_change",
      submissionId: submission.id,
      status: "grading",
      timestamp: new Date().toISOString(),
    });

    // 2. Delete existing grading result if re-grading (cascade deletes criterion_scores)
    const existingResult = db
      .select({ id: schema.gradingResults.id })
      .from(schema.gradingResults)
      .where(eq(schema.gradingResults.submissionId, submission.id))
      .get();

    if (existingResult) {
      db.delete(schema.gradingResults)
        .where(eq(schema.gradingResults.id, existingResult.id))
        .run();
    }

    // 3. Grade each problem sequentially within this submission
    const allCriterionScoreInserts: {
      id: string;
      gradingResultId: string;
      criterionId: string;
      earned: boolean;
      aiFeedback: string;
      needsReview: boolean;
    }[] = [];

    // Get the assignment description for the prompt
    const assignmentDesc = db
      .select({ description: schema.assignments.description })
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .get();

    for (const problem of problemsWithCriteria) {
      const promptInput: GradeProblemPromptInput = {
        assignmentDescription: assignmentDesc?.description ?? "",
        problemName: problem.name,
        problemDescription: problem.description,
        criteria: problem.criteria.map((c) => ({
          criterionId: c.id,
          description: c.description,
          points: c.points,
        })),
        submissionText: submission.fileContent,
      };

      const output = await gradeProblem(promptInput);

      // Collect results for DB insertion. When the grader flags a criterion
      // for manual review, clamp earned=false so the score defaults to 0
      // until a TA reviews it.
      for (const score of output.scores) {
        const needsReview = score.needsReview ?? false;
        allCriterionScoreInserts.push({
          id: crypto.randomUUID(),
          gradingResultId: "", // filled after grading_result insert
          criterionId: score.criterionId,
          earned: needsReview ? false : score.earned,
          aiFeedback: score.feedback,
          needsReview,
        });
      }
    }

    // 4. Serialize DB writes: insert grading_result + criterion_scores in transaction
    const gradingResultId = crypto.randomUUID();
    const gradedAt = new Date();

    db.transaction((tx) => {
      tx.insert(schema.gradingResults)
        .values({
          id: gradingResultId,
          submissionId: submission.id,
          modelUsed: "gpt-4o",
          gradedAt,
        })
        .run();

      for (const cs of allCriterionScoreInserts) {
        tx.insert(schema.criterionScores)
          .values({
            id: cs.id,
            gradingResultId,
            criterionId: cs.criterionId,
            earned: cs.earned,
            aiFeedback: cs.aiFeedback,
          })
          .run();
      }

      // Set status to "graded"
      tx.update(schema.submissions)
        .set({ status: "graded", updatedAt: new Date() })
        .where(eq(schema.submissions.id, submission.id))
        .run();
    });

    // 5. Compute scores for the SSE event
    const problemScores: ProblemScoreSummary[] = [];
    let totalScore = 0;

    for (const problem of problemsWithCriteria) {
      let problemScore = 0;
      let problemMax = 0;

      for (const criterion of problem.criteria) {
        const csRow = allCriterionScoreInserts.find(
          (cs) => cs.criterionId === criterion.id
        );
        if (csRow) {
          const effective = computeEffectiveScore(
            csRow.earned,
            criterion.points,
            null // no override on initial grading
          );
          problemScore += effective;
        }
        problemMax += criterion.points;
      }

      problemScores.push({
        problemId: problem.id,
        problemName: problem.name,
        score: problemScore,
        maxScore: problemMax,
      });
      totalScore += problemScore;
    }

    // Emit score_ready event
    emitGradeEvent(assignmentId, {
      type: "score_ready",
      submissionId: submission.id,
      status: "graded",
      totalScore,
      problemScores,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      `Grading failed for submission ${submission.id}:`,
      err
    );

    // Reset status to "pending" on failure
    try {
      db.update(schema.submissions)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(schema.submissions.id, submission.id))
        .run();
    } catch (resetErr) {
      console.error(
        `Failed to reset status for submission ${submission.id}:`,
        resetErr
      );
    }

    // Emit error event
    emitGradeEvent(assignmentId, {
      type: "error",
      submissionId: submission.id,
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
