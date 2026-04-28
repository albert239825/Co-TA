"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import type {
  AssignmentResponse,
  SubmissionListItem,
  GradeStreamEvent,
} from "@/contracts/types";
import StatusPill from "@/components/StatusPill";
import ScoreBar from "@/components/ScoreBar";
import StatCard from "@/components/StatCard";
import SubmissionUpload from "@/components/SubmissionUpload";
import ModelPicker from "@/components/ModelPicker";
import { useGradeStream } from "@/hooks/useGradeStream";

export default function TriagePage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(true);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [gradeProgress, setGradeProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch(`/api/assignments/${assignmentId}`),
          fetch(`/api/assignments/${assignmentId}/submissions`),
        ]);
        if (aRes.ok) setAssignment(await aRes.json());
        if (sRes.ok) setSubmissions(await sRes.json());
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignmentId]);

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
      setGradeProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    },
    onBatchComplete: () => {
      setGradeProgress({ done: 0, total: 0 });
    },
    onError: (event: GradeStreamEvent) => {
      console.error("Grading error:", event.error);
      updateSubmission(event.submissionId, (s) => ({
        ...s,
        status: "pending",
      }));
      setGradeProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    },
  });

  async function handleGradeAll() {
    const pendingIds = submissions
      .filter((s) => s.status === "pending")
      .map((s) => s.id);

    if (pendingIds.length === 0) return;

    setGradeProgress({ done: 0, total: pendingIds.length });

    const res = await fetch("/api/grade/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, submissionIds: pendingIds }),
    });
    if (res.ok) {
      const data = await res.json();
      startStream(data.streamUrl);
    }
  }

  async function handleModelChange(newModelId: string | null) {
    if (!assignment) return;
    // Optimistic update so the popover trigger label refreshes immediately.
    const previous = assignment.selectedModelId;
    setAssignment({ ...assignment, selectedModelId: newModelId });
    setModelSaving(true);
    setModelError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModelId: newModelId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      // Roll back the optimistic update so UI matches server state.
      setAssignment((prev) =>
        prev ? { ...prev, selectedModelId: previous } : prev,
      );
      setModelError(err instanceof Error ? err.message : String(err));
    } finally {
      setModelSaving(false);
    }
  }

  function handleExport() {
    window.open(
      `/api/export?assignmentId=${assignmentId}&format=csv`,
      "_blank"
    );
  }

  const handleUploadComplete = useCallback(
    (newSubmissions: SubmissionListItem[]) => {
      setSubmissions((prev) => [...prev, ...newSubmissions]);
    },
    []
  );

  if (loading || !assignment) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
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
      {/* Upload component */}
      {showUpload ? (
        <div className="mb-4">
          <SubmissionUpload
            assignmentId={assignmentId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            + Add more submissions
          </button>
        </div>
      )}

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
          {isStreaming
            ? `Grading\u2026 (${gradeProgress.done}/${gradeProgress.total})`
            : "Grade all pending"}
        </button>
        <button
          onClick={handleExport}
          className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3.5 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
        <div className="ml-auto flex items-center gap-2">
          {modelError && (
            <span className="text-[11px] text-red-600 dark:text-red-400">
              Failed to save model: {modelError}
            </span>
          )}
          <ModelPicker
            selectedModelId={assignment.selectedModelId}
            onChange={handleModelChange}
            disabled={modelSaving || isStreaming}
          />
        </div>
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
