"use client";

import type { SubmissionStatus } from "@/contracts/types";

const config: Record<
  SubmissionStatus,
  { bg: string; text: string; label: string }
> = {
  reviewed: {
    bg: "bg-emerald-100 dark:bg-emerald-900/50",
    text: "text-emerald-800 dark:text-emerald-300",
    label: "Reviewed",
  },
  graded: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Graded",
  },
  grading: {
    bg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-800 dark:text-amber-300",
    label: "Grading",
  },
  pending: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-500 dark:text-zinc-400",
    label: "Pending",
  },
};

export default function StatusPill({ status }: { status: SubmissionStatus }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {status === "grading" && (
        <span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin" />
      )}
      {c.label}
    </span>
  );
}
