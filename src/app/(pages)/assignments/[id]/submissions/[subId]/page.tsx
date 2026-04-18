"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type {
  SubmissionDetailResponse,
  ProblemGradeResponse,
  CriterionScoreResponse,
} from "@/contracts/types";
import CriterionToggle from "@/components/CriterionToggle";

function recomputeProblemScore(criteria: CriterionScoreResponse[]): number {
  return criteria.reduce((sum, c) => sum + c.effectiveScore, 0);
}

function recomputeTotalScore(problems: ProblemGradeResponse[]): number {
  return problems.reduce(
    (sum, p) => sum + recomputeProblemScore(p.criteria),
    0
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const subId = params.subId as string;

  const [detail, setDetail] = useState<SubmissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [regrading, setRegrading] = useState(false);
  // Set of criterionScoreIds that the TA overrode but didn't comment on.
  // Populated on Approve click; cleared when the TA starts typing a comment
  // or toggles the row back to matching the AI (not an override anymore).
  const [missingCommentIds, setMissingCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [approveError, setApproveError] = useState<string | null>(null);
  const missingRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/submissions/${subId}`);
        if (res.ok) setDetail(await res.json());
      } catch {
        // leave null
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subId]);

  const problems = detail?.gradingResult?.problems ?? [];

  const totalScore = detail?.gradingResult
    ? recomputeTotalScore(detail.gradingResult.problems)
    : detail?.totalScore ?? 0;

  const handleToggle = useCallback(
    (criterionScoreId: string, newEarned: boolean) => {
      if (!detail?.gradingResult) return;

      // Find the criterion's point value before updating state
      const criterion = detail.gradingResult.problems
        .flatMap((p) => p.criteria)
        .find((c) => c.criterionScoreId === criterionScoreId);
      const overrideValue = newEarned ? (criterion?.points ?? 0) : 0;

      // Optimistic UI update
      setDetail((prev) => {
        if (!prev?.gradingResult) return prev;

        const updatedProblems = prev.gradingResult.problems.map((problem) => {
          const updatedCriteria = problem.criteria.map((c) => {
            if (c.criterionScoreId !== criterionScoreId) return c;
            const newEffective = newEarned ? c.points : 0;
            return {
              ...c,
              earned: newEarned,
              overrideScore: newEffective,
              effectiveScore: newEffective,
            };
          });
          return {
            ...problem,
            criteria: updatedCriteria,
            score: recomputeProblemScore(updatedCriteria),
          };
        });

        return {
          ...prev,
          totalScore: recomputeTotalScore(updatedProblems),
          gradingResult: {
            ...prev.gradingResult,
            problems: updatedProblems,
          },
        };
      });

      // Preserve existing taComment across toggles: the PATCH handler on
      // `main` today treats a missing taComment field as "set to null",
      // which would clobber any comment the TA has already typed. We
      // always send the current value.
      const existingComment = criterion?.taComment ?? null;

      // Fire PATCH in background (outside state updater)
      fetch(`/api/criterion-scores/${criterionScoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideScore: overrideValue,
          taComment: existingComment,
        }),
      }).catch(() => {
        // Keep optimistic state on failure
      });
    },
    [detail?.gradingResult]
  );

  const handleCommentChange = useCallback(
    (criterionScoreId: string, newComment: string) => {
      const trimmed = newComment.trim();

      // Clear the "missing" highlight once the TA starts actually typing.
      if (trimmed.length > 0) {
        setMissingCommentIds((prev) => {
          if (!prev.has(criterionScoreId)) return prev;
          const next = new Set(prev);
          next.delete(criterionScoreId);
          return next;
        });
      }

      setDetail((prev) => {
        if (!prev?.gradingResult) return prev;
        const updatedProblems = prev.gradingResult.problems.map((problem) => ({
          ...problem,
          criteria: problem.criteria.map((c) =>
            c.criterionScoreId === criterionScoreId
              ? { ...c, taComment: trimmed.length > 0 ? trimmed : null }
              : c,
          ),
        }));
        return {
          ...prev,
          gradingResult: { ...prev.gradingResult, problems: updatedProblems },
        };
      });

      // Find the current overrideScore so the PATCH doesn't unset it.
      const criterion = detail?.gradingResult?.problems
        .flatMap((p) => p.criteria)
        .find((c) => c.criterionScoreId === criterionScoreId);
      const overrideScore = criterion?.overrideScore ?? null;

      fetch(`/api/criterion-scores/${criterionScoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideScore,
          taComment: trimmed.length > 0 ? trimmed : null,
        }),
      }).catch(() => {
        // Keep optimistic state on failure
      });
    },
    [detail?.gradingResult],
  );

  async function handleApprove() {
    // Deferred validation: block Approve if any overridden criterion is
    // missing a comment. Mark them, scroll to the first offender, and
    // surface a banner so the TA knows what to fix.
    const missing: string[] = [];
    for (const problem of problems) {
      for (const c of problem.criteria) {
        if (c.overrideScore !== null && !(c.taComment ?? "").trim()) {
          missing.push(c.criterionScoreId);
        }
      }
    }

    if (missing.length > 0) {
      setMissingCommentIds(new Set(missing));
      setApproveError(
        `Add a comment for ${missing.length} overridden ${
          missing.length === 1 ? "criterion" : "criteria"
        } before approving.`,
      );
      const firstEl = missingRefs.current.get(missing[0]);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setApproveError(null);
    setMissingCommentIds(new Set());
    setApproving(true);
    await fetch(`/api/submissions/${subId}/review`, {
      method: "PATCH",
    });
    // Navigate back to triage
    router.push(`/assignments/${assignmentId}`);
  }

  async function handleRegrade() {
    setRegrading(true);
    try {
      const res = await fetch("/api/grade/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          submissionIds: [subId],
        }),
      });
      if (res.ok) {
        // Refresh detail after regrading
        const detailRes = await fetch(`/api/submissions/${subId}`);
        if (detailRes.ok) {
          setDetail(await detailRes.json());
        }
      }
    } finally {
      setRegrading(false);
    }
  }

  if (loading || !detail) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-zinc-400 text-sm">Loading submission...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <Link
            href={`/assignments/${assignmentId}`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            &larr; Back to submissions
          </Link>
          <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mt-1">
            {detail.studentIdentifier}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">{detail.fileName}</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-medium font-mono text-zinc-900 dark:text-zinc-100">
            {totalScore}
          </span>
          <span className="text-base font-mono text-zinc-400">
            / {detail.maxScore}
          </span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left panel — Submission text */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium mb-3">
            Submission
          </p>
          <div className="max-h-[600px] overflow-y-auto">
            <pre className="text-sm leading-relaxed font-mono whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
              {detail.fileContent}
            </pre>
          </div>
        </div>

        {/* Right panel — Rubric scoring */}
        <div>
          {problems.map((problem) => (
            <div key={problem.problemId} className="mb-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800 mb-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {problem.problemName}
                </span>
                <span className="text-sm font-mono text-zinc-500">
                  {recomputeProblemScore(problem.criteria)} / {problem.maxScore}
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {problem.criteria.map((criterion) => (
                  <div
                    key={criterion.criterionScoreId}
                    ref={(el) => {
                      if (el) {
                        missingRefs.current.set(
                          criterion.criterionScoreId,
                          el,
                        );
                      } else {
                        missingRefs.current.delete(criterion.criterionScoreId);
                      }
                    }}
                  >
                    <CriterionToggle
                      criterionScoreId={criterion.criterionScoreId}
                      description={criterion.description}
                      points={criterion.points}
                      earned={criterion.earned}
                      aiFeedback={criterion.aiFeedback}
                      overrideScore={criterion.overrideScore}
                      taComment={criterion.taComment}
                      onToggle={handleToggle}
                      onCommentChange={handleCommentChange}
                      missingComment={missingCommentIds.has(
                        criterion.criterionScoreId,
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {approveError && (
            <div
              role="alert"
              className="mt-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
            >
              {approveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
            >
              {approving ? "Approving..." : "Approve and next"}
            </button>
            <button
              onClick={handleRegrade}
              disabled={regrading}
              className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              {regrading ? "Re-grading..." : "Re-grade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
