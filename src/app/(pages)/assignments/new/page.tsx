"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CreateAssignmentRequest,
  CreateProblemInput,
  CreateCriterionInput,
} from "@/contracts/types";

interface CriterionForm {
  description: string;
  points: string;
}

interface ProblemForm {
  name: string;
  description: string;
  criteria: CriterionForm[];
}

export default function NewAssignmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [problems, setProblems] = useState<ProblemForm[]>([
    {
      name: "",
      description: "",
      criteria: [{ description: "", points: "" }],
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const newCriterionRef = useRef<HTMLInputElement | null>(null);
  const newProblemRef = useRef<HTMLInputElement | null>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  useEffect(() => {
    if (focusTarget === "problem" && newProblemRef.current) {
      newProblemRef.current.focus();
      setFocusTarget(null);
    }
    if (focusTarget === "criterion" && newCriterionRef.current) {
      newCriterionRef.current.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, problems]);

  const totalPoints = problems.reduce(
    (sum, p) =>
      sum +
      p.criteria.reduce((cs, c) => cs + (parseFloat(c.points) || 0), 0),
    0
  );

  function addProblem() {
    setProblems([
      ...problems,
      { name: "", description: "", criteria: [{ description: "", points: "" }] },
    ]);
    setFocusTarget("problem");
  }

  function removeProblem(pi: number) {
    setProblems(problems.filter((_, i) => i !== pi));
  }

  function updateProblem(pi: number, field: keyof ProblemForm, value: string) {
    const updated = [...problems];
    if (field === "name" || field === "description") {
      updated[pi] = { ...updated[pi], [field]: value };
    }
    setProblems(updated);
  }

  function addCriterion(pi: number) {
    const updated = [...problems];
    updated[pi] = {
      ...updated[pi],
      criteria: [...updated[pi].criteria, { description: "", points: "" }],
    };
    setProblems(updated);
    setFocusTarget("criterion");
  }

  function removeCriterion(pi: number, ci: number) {
    const updated = [...problems];
    updated[pi] = {
      ...updated[pi],
      criteria: updated[pi].criteria.filter((_, i) => i !== ci),
    };
    setProblems(updated);
  }

  function updateCriterion(
    pi: number,
    ci: number,
    field: keyof CriterionForm,
    value: string
  ) {
    const updated = [...problems];
    updated[pi] = {
      ...updated[pi],
      criteria: updated[pi].criteria.map((c, i) =>
        i === ci ? { ...c, [field]: value } : c
      ),
    };
    setProblems(updated);
  }

  function validate(): string | null {
    if (!name.trim()) return "Assignment name is required.";
    if (problems.length === 0) return "At least one problem is required.";
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      if (!p.name.trim()) return `Problem ${i + 1} needs a name.`;
      if (p.criteria.length === 0)
        return `Problem "${p.name}" needs at least one criterion.`;
      for (let j = 0; j < p.criteria.length; j++) {
        const c = p.criteria[j];
        if (!c.description.trim())
          return `Problem "${p.name}", criterion ${j + 1} needs a description.`;
        const pts = parseFloat(c.points);
        if (!pts || pts <= 0)
          return `Problem "${p.name}", criterion ${j + 1} needs points > 0.`;
      }
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);

    const request: CreateAssignmentRequest = {
      name: name.trim(),
      description: description.trim(),
      problems: problems.map(
        (p, pi): CreateProblemInput => ({
          name: p.name.trim(),
          description: p.description.trim(),
          sortOrder: pi + 1,
          criteria: p.criteria.map(
            (c, ci): CreateCriterionInput => ({
              description: c.description.trim(),
              points: parseFloat(c.points),
              sortOrder: ci + 1,
            })
          ),
        })
      ),
    };

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }
      const created = await res.json();
      router.push(`/assignments/${created.id}`);
    } catch {
      // Fallback for when backend isn't ready
      console.log("POST /api/assignments payload:", request);
      router.push(`/assignments/${mockAssignmentId}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "w-full bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Assignments
      </Link>
      <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mt-4 mb-6">
        New assignment
      </h1>

      {/* Metadata */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Assignment name
            </label>
            <input
              type="text"
              className={inputClasses}
              placeholder="e.g. HW4: Backpropagation and SGD"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Assignment prompt
            </label>
            <textarea
              className={`${inputClasses} min-h-[100px]`}
              rows={4}
              placeholder="The full assignment text students received..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Rubric editor */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Rubric
          </h2>
          <button
            type="button"
            onClick={addProblem}
            className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Add problem
          </button>
        </div>

        <div className="space-y-4">
          {problems.map((problem, pi) => (
            <div
              key={pi}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 space-y-3">
                  <input
                    ref={pi === problems.length - 1 ? newProblemRef : undefined}
                    type="text"
                    className={inputClasses}
                    placeholder={`Problem ${pi + 1} name (e.g. Q1: Chain rule derivation)`}
                    value={problem.name}
                    onChange={(e) => updateProblem(pi, "name", e.target.value)}
                  />
                  <textarea
                    className={inputClasses}
                    rows={2}
                    placeholder="What this problem asks..."
                    value={problem.description}
                    onChange={(e) =>
                      updateProblem(pi, "description", e.target.value)
                    }
                  />
                </div>
                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProblem(pi)}
                    className="text-zinc-400 hover:text-red-500 p-1 mt-1"
                    title="Remove problem"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
                {problem.criteria.map((criterion, ci) => (
                  <div key={ci} className="flex items-center gap-2 group">
                    <input
                      ref={
                        pi === problems.length - 1 &&
                        ci === problem.criteria.length - 1
                          ? newCriterionRef
                          : undefined
                      }
                      type="text"
                      className={`flex-1 ${inputClasses}`}
                      placeholder="Criterion description"
                      value={criterion.description}
                      onChange={(e) =>
                        updateCriterion(pi, ci, "description", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      className={`w-20 text-right ${inputClasses}`}
                      placeholder="Pts"
                      min="0"
                      step="1"
                      value={criterion.points}
                      onChange={(e) =>
                        updateCriterion(pi, ci, "points", e.target.value)
                      }
                    />
                    {problem.criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriterion(pi, ci)}
                        className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Remove criterion"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            d="M4 4L12 12M12 4L4 12"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addCriterion(pi)}
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mt-1"
                >
                  + Add criterion
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-mono text-zinc-500">
          Total: {totalPoints} pts
        </span>
        <div className="flex items-center gap-3">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

const mockAssignmentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
