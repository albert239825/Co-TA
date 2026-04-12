"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { mockSubmissionDetail } from "@/lib/mock-data";
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

  const [detail, setDetail] = useState<SubmissionDetailResponse>(
    mockSubmissionDetail
  );
  const [approving, setApproving] = useState(false);
  const [regrading, setRegrading] = useState(false);

  const problems = detail.gradingResult?.problems ?? [];

  const totalScore = detail.gradingResult
    ? recomputeTotalScore(detail.gradingResult.problems)
    : detail.totalScore;

  const handleToggle = useCallback(
    (criterionScoreId: string, newEarned: boolean) => {
      setDetail((prev) => {
        if (!prev.gradingResult) return prev;

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

        const newTotal = recomputeTotalScore(updatedProblems);

        // Fire PATCH in background
        fetch(`/api/criterion-scores/${criterionScoreId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overrideScore: newEarned
              ? updatedProblems
                  .flatMap((p) => p.criteria)
                  .find((c) => c.criterionScoreId === criterionScoreId)?.points ?? 0
              : 0,
          }),
        }).catch(() => {
          // Backend not ready — keep optimistic state
          console.log("PATCH criterion-score (mock):", criterionScoreId);
        });

        return {
          ...prev,
          totalScore: newTotal,
          gradingResult: {
            ...prev.gradingResult,
            problems: updatedProblems,
          },
        };
      });
    },
    []
  );

  async function handleApprove() {
    setApproving(true);
    try {
      await fetch(`/api/submissions/${subId}/review`, {
        method: "PATCH",
      });
    } catch {
      console.log("PATCH review (mock):", subId);
    }
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
    } catch {
      console.log("Re-grade (mock):", subId);
    } finally {
      setRegrading(false);
    }
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
                  <CriterionToggle
                    key={criterion.criterionScoreId}
                    criterionScoreId={criterion.criterionScoreId}
                    description={criterion.description}
                    points={criterion.points}
                    earned={criterion.earned}
                    aiFeedback={criterion.aiFeedback}
                    overrideScore={criterion.overrideScore}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          ))}

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
