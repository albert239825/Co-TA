"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  mockAssignment,
  mockSubmissions,
} from "@/lib/mock-data";
import type { SubmissionListItem, GradeStreamEvent } from "@/contracts/types";
import StatusPill from "@/components/StatusPill";
import ScoreBar from "@/components/ScoreBar";
import StatCard from "@/components/StatCard";
import { useGradeStream } from "@/hooks/useGradeStream";

export default function TriagePage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const assignment = mockAssignment;
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>(mockSubmissions);

  const updateSubmission = useCallback(
    (subId: string, updater: (s: SubmissionListItem) => SubmissionListItem) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === subId ? updater(s) : s))
      );
    },
    []
  );

  const { isStreaming, startStream } = useGradeStream({
    onStatusChange: (event: GradeStreamEvent) => {
      if (event.status) {
        updateSubmission(event.submissionId, (s) => ({
          ...s,
          status: event.status!,
        }));
      }
    },
    onScoreReady: (event: GradeStreamEvent) => {
      updateSubmission(event.submissionId, (s) => ({
        ...s,
        status: "graded",
        totalScore: event.totalScore ?? s.totalScore,
        problemScores: event.problemScores ?? s.problemScores,
      }));
    },
    onBatchComplete: () => {
      // Stats recalculated automatically from submissions state
    },
    onError: (event: GradeStreamEvent) => {
      console.error("Grading error:", event.error);
      updateSubmission(event.submissionId, (s) => ({
        ...s,
        status: "pending",
      }));
    },
  });

  async function handleGradeAll() {
    const pendingIds = submissions
      .filter((s) => s.status === "pending")
      .map((s) => s.id);

    if (pendingIds.length === 0) return;

    try {
      const res = await fetch("/api/grade/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, submissionIds: pendingIds }),
      });
      if (res.ok) {
        const data = await res.json();
        startStream(data.streamUrl);
        return;
      }
    } catch {
      // Backend not ready — use mock stream
    }

    startStream(`mock://grade/stream?assignmentId=${assignmentId}`);
  }

  function handleExport() {
    window.open(
      `/api/export?assignmentId=${assignmentId}&format=csv`,
      "_blank"
    );
  }

  // Computed stats
  const totalSubs = submissions.length;
  const gradedCount = submissions.filter(
    (s) => s.status === "graded" || s.status === "reviewed"
  ).length;
  const reviewedCount = submissions.filter(
    (s) => s.status === "reviewed"
  ).length;
  const scoredSubs = submissions.filter((s) => s.totalScore !== null);
  const avgScore =
    scoredSubs.length > 0
      ? Math.round(
          scoredSubs.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) /
            scoredSubs.length
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {assignment.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            CIS 5200 - Machine Learning &middot; {assignment.maxScore} pts
            possible
          </p>
        </div>
        <div className="flex gap-3">
          <StatCard label="Submissions" value={totalSubs} />
          <StatCard label="Graded" value={gradedCount} />
          <StatCard label="Reviewed" value={reviewedCount} />
          <StatCard label="Avg score" value={avgScore} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGradeAll}
          disabled={isStreaming}
          className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isStreaming ? "Grading..." : "Grade all pending"}
        </button>
        <button
          onClick={handleExport}
          className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3.5 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </div>

      {/* Triage table */}
      <table className="w-full text-sm table-fixed border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left text-[11px] text-zinc-400 uppercase tracking-wide font-medium py-2 px-2.5 w-[22%]">
              Student
            </th>
            {assignment.problems.map((p) => (
              <th
                key={p.id}
                className="text-center text-[11px] text-zinc-400 uppercase tracking-wide font-medium py-2 px-2.5 w-[13%]"
              >
                <span className="block">{p.name.replace(/^Q\d+:\s*/, "Q" + p.sortOrder + ": ").substring(0, 16)}</span>
                <span className="font-normal normal-case tracking-normal">
                  ({p.maxScore} pts)
                </span>
              </th>
            ))}
            <th className="text-center text-[11px] text-zinc-400 uppercase tracking-wide font-medium py-2 px-2.5 w-[13%]">
              Total
            </th>
            <th className="text-left text-[11px] text-zinc-400 uppercase tracking-wide font-medium py-2 px-2.5 w-[13%]">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const isClickable =
              sub.status === "graded" || sub.status === "reviewed";
            const isPending = sub.status === "pending";
            const isGrading = sub.status === "grading";

            return (
              <tr
                key={sub.id}
                className={`border-b border-zinc-100 dark:border-zinc-800 transition-opacity duration-500 ${
                  isClickable
                    ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    : ""
                } ${isGrading ? "opacity-70" : ""} ${isPending ? "opacity-45" : ""}`}
                onClick={
                  isClickable
                    ? () =>
                        router.push(
                          `/assignments/${assignmentId}/submissions/${sub.id}`
                        )
                    : undefined
                }
              >
                <td className="py-2.5 px-2.5 text-zinc-900 dark:text-zinc-100">
                  {sub.studentIdentifier}
                </td>
                {assignment.problems.map((problem) => {
                  const ps = sub.problemScores.find(
                    (s) => s.problemId === problem.id
                  );
                  const hasScore =
                    ps && (sub.status === "graded" || sub.status === "reviewed" || (isGrading && ps.score > 0));

                  return (
                    <td key={problem.id} className="py-2.5 px-2.5">
                      {hasScore ? (
                        <div>
                          <span className="font-mono text-sm text-center block text-zinc-900 dark:text-zinc-100">
                            {ps.score}/{ps.maxScore}
                          </span>
                          <ScoreBar score={ps.score} max={ps.maxScore} />
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-center block text-zinc-400">
                          --
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 px-2.5 text-center">
                  {sub.totalScore !== null ? (
                    <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {sub.totalScore}/{sub.maxScore}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-zinc-400">--</span>
                  )}
                </td>
                <td className="py-2.5 px-2.5">
                  <StatusPill status={sub.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
