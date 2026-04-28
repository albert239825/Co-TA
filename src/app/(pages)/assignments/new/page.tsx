"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AssignmentForm from "@/components/AssignmentForm";
import type { AssignmentFormData } from "@/components/AssignmentForm";
import type {
  CreateAssignmentRequest,
  CreateProblemInput,
  CreateCriterionInput,
} from "@/contracts/types";

export default function NewAssignmentPage() {
  const router = useRouter();

  async function handleSubmit(data: AssignmentFormData) {
    const request: CreateAssignmentRequest = {
      name: data.name.trim(),
      description: data.description.trim(),
      problems: data.problems.map(
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

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      let errorMessage = "Failed to create assignment";
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
    const created = await res.json();
    router.push(`/assignments/${created.id}`);
  }

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

      <AssignmentForm
        onSubmit={handleSubmit}
        submitLabel="Create assignment"
        submittingLabel="Creating..."
      />
    </div>
  );
}
