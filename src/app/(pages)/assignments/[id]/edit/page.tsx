"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import AssignmentForm from "@/components/AssignmentForm";
import type { AssignmentFormData } from "@/components/AssignmentForm";
import type {
  AssignmentResponse,
  SubmissionListItem,
  EditAssignmentRequest,
  EditProblemInput,
  EditCriterionInput,
} from "@/contracts/types";

type ResetChoice = "reset" | "keep" | null;

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingData, setPendingData] = useState<AssignmentFormData | null>(null);

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

  const hasGradedSubmissions = submissions.some(
    (s) => s.status === "graded" || s.status === "reviewed"
  );

  async function submitEdit(data: AssignmentFormData, resetGrades: boolean) {
    const request: EditAssignmentRequest = {
      name: data.name.trim(),
      description: data.description.trim(),
      resetGrades,
      problems: data.problems.map(
        (p, pi): EditProblemInput => ({
          ...(p.id ? { id: p.id } : {}),
          name: p.name.trim(),
          description: p.description.trim(),
          sortOrder: pi + 1,
          criteria: p.criteria.map(
            (c, ci): EditCriterionInput => ({
              ...(c.id ? { id: c.id } : {}),
              description: c.description.trim(),
              points: parseFloat(c.points),
              sortOrder: ci + 1,
            })
          ),
        })
      ),
    };

    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      let errorMessage = "Failed to update assignment";
      try {
        const errData = await res.json();
        if (errData?.details) {
          errorMessage = `${errData.error ?? "Validation failed"}: ${errData.details}`;
        } else if (errData?.error) {
          errorMessage = errData.error;
        }
      } catch {
        // Non-JSON error body
      }
      throw new Error(errorMessage);
    }
    router.push(`/assignments/${assignmentId}`);
  }

  async function handleSubmit(data: AssignmentFormData) {
    if (hasGradedSubmissions) {
      setPendingData(data);
      setShowWarning(true);
      return;
    }
    await submitEdit(data, false);
  }

  async function handleWarningChoice(choice: ResetChoice) {
    setShowWarning(false);
    if (!pendingData || choice === null) return;
    await submitEdit(pendingData, choice === "reset");
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-red-500 text-sm">Assignment not found.</p>
      </div>
    );
  }

  const initialData: AssignmentFormData = {
    name: assignment.name,
    description: assignment.description,
    problems: assignment.problems.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      criteria: p.criteria.map((c) => ({
        id: c.id,
        description: c.description,
        points: String(c.points),
      })),
    })),
  };

  const gradedCount = submissions.filter(
    (s) => s.status === "graded" || s.status === "reviewed"
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href={`/assignments/${assignmentId}`}
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Back to {assignment.name}
      </Link>
      <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mt-4 mb-6">
        Edit assignment
      </h1>

      {hasGradedSubmissions && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Warning:</strong> This assignment has {gradedCount} graded
            submission{gradedCount !== 1 ? "s" : ""}. Editing the rubric may
            make existing grades inconsistent. When you save, you&apos;ll be asked
            whether to keep or reset existing grades.
          </p>
        </div>
      )}

      <AssignmentForm
        initial={initialData}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        submittingLabel="Saving..."
      />

      {/* Warning dialog */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              Existing grades detected
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              This assignment has {gradedCount} graded submission
              {gradedCount !== 1 ? "s" : ""}. How would you like to handle
              them?
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleWarningChoice("reset")}
                className="w-full text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <span className="block text-sm font-medium text-amber-900 dark:text-amber-200">
                  Reset grades &amp; re-grade (recommended for significant
                  changes)
                </span>
                <span className="block text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  All graded submissions will be reset to &ldquo;pending&rdquo;
                  so you can re-run grading with the updated rubric.
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleWarningChoice("keep")}
                className="w-full text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Keep existing grades
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Grades will remain as-is. Some scores may reference criteria
                  that no longer exist.
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleWarningChoice(null)}
                className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
