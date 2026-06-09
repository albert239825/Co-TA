"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssignmentForm from "@/components/AssignmentForm";
import type { AssignmentFormData } from "@/components/AssignmentForm";
import type {
  CreateAssignmentRequest,
  CreateProblemInput,
  CreateCriterionInput,
} from "@/contracts/types";
import { assignmentTemplateSchema } from "@/lib/template";

export default function NewAssignmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importedData, setImportedData] = useState<
    AssignmentFormData | undefined
  >(undefined);
  const [importKey, setImportKey] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers onChange.
    e.target.value = "";
    if (!file) return;

    setImportMessage(null);
    setImportError(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = assignmentTemplateSchema.safeParse(json);
      if (!result.success) {
        const details = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        setImportError(`Invalid template file: ${details}`);
        return;
      }

      const template = result.data;
      const formData: AssignmentFormData = {
        name: template.name,
        description: template.description,
        problems: template.problems.map((p) => ({
          name: p.name,
          description: p.description,
          criteria: p.criteria.map((c) => ({
            description: c.description,
            points: String(c.points),
          })),
        })),
      };

      setImportedData(formData);
      setImportKey((k) => k + 1);
      setImportMessage("Template imported — review and adjust before creating.");
    } catch {
      setImportError("Could not read file. Make sure it is valid JSON.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Assignments
      </Link>
      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          New assignment
        </h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3.5 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Import template
          </button>
        </div>
      </div>

      {importMessage && (
        <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">
          {importMessage}
        </p>
      )}
      {importError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {importError}
        </p>
      )}

      <AssignmentForm
        key={importKey}
        initial={importedData}
        onSubmit={handleSubmit}
        submitLabel="Create assignment"
        submittingLabel="Creating..."
      />
    </div>
  );
}
