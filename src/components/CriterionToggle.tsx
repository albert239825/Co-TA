"use client";

import { useEffect, useRef, useState } from "react";

interface CriterionToggleProps {
  criterionScoreId: string;
  description: string;
  points: number;
  earned: boolean;
  aiFeedback: string;
  overrideScore: number | null;
  taComment: string | null;
  // True when the AI flagged this criterion as uncertain; renders the yellow
  // "needs manual review" treatment. The criterion is forced to earned=false
  // at grade time so the score starts at 0 until the TA reviews/overrides.
  needsReview: boolean;
  onToggle: (criterionScoreId: string, newEarned: boolean) => void;
  // Fired when the TA finishes editing the comment (blur / explicit save).
  // The parent is responsible for persisting the value.
  onCommentChange: (criterionScoreId: string, newComment: string) => void;
  // When true, the comment row is highlighted (red border + helper text)
  // because the TA tried to Approve without filling it in. Cleared on edit.
  missingComment?: boolean;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3 text-emerald-600 dark:text-emerald-400">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3 text-red-600 dark:text-red-400">
      <path
        d="M3 3L9 9M9 3L3 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3 text-amber-700 dark:text-amber-300">
      <path
        d="M3 1.5V10.5M3 2L8.5 2L7 4L8.5 6L3 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CriterionToggle({
  criterionScoreId,
  description,
  points,
  earned,
  aiFeedback,
  overrideScore,
  taComment,
  needsReview,
  onToggle,
  onCommentChange,
  missingComment = false,
}: CriterionToggleProps) {
  // Local-only draft so keystrokes don't PATCH on every character. We push
  // the value up on blur via onCommentChange.
  const [draft, setDraft] = useState(taComment ?? "");
  const lastSyncedRef = useRef(taComment ?? "");

  // Keep the draft in sync when the parent's taComment changes (e.g. after
  // a refresh or another criterion's PATCH triggers a re-render). We only
  // overwrite the draft if the parent value differs from what we last synced
  // so we don't clobber in-flight typing.
  useEffect(() => {
    const next = taComment ?? "";
    if (next !== lastSyncedRef.current) {
      setDraft(next);
      lastSyncedRef.current = next;
    }
  }, [taComment]);

  const isOverridden = overrideScore !== null;

  function handleBlur() {
    const trimmed = draft;
    if (trimmed !== (taComment ?? "")) {
      lastSyncedRef.current = trimmed;
      onCommentChange(criterionScoreId, trimmed);
    }
  }

  // The yellow "needs review" treatment only applies until the TA interacts
  // with the row. Once they've explicitly overridden (overrideScore set),
  // the blue "TA override" chip takes precedence — the flag has served its
  // purpose.
  const showNeedsReview = needsReview && !isOverridden;

  // Circle color: yellow flag > earned > not-earned.
  const circleClass = showNeedsReview
    ? "bg-amber-100 dark:bg-amber-900/60 ring-1 ring-amber-400 dark:ring-amber-500"
    : earned
      ? "bg-emerald-100 dark:bg-emerald-900"
      : "bg-red-100 dark:bg-red-900";

  const rowHighlight = showNeedsReview
    ? "bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-950/40"
    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50";

  return (
    <div className={`py-2 px-1 rounded-md transition-colors ${rowHighlight}`}>
      <div
        className="flex gap-2.5 items-start cursor-pointer"
        onClick={() => onToggle(criterionScoreId, !earned)}
      >
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform hover:scale-110 ${circleClass}`}
        >
          {showNeedsReview ? <FlagIcon /> : earned ? <CheckIcon /> : <XIcon />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-zinc-900 dark:text-zinc-100">
              {description}
            </span>
            <span className="font-mono text-xs text-zinc-400 whitespace-nowrap">
              {points} pts
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {aiFeedback}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {showNeedsReview && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                Needs manual review — defaulted to not earned
              </span>
            )}
            {isOverridden && (
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                TA override: awarded {overrideScore} pts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comment textarea — inline under the criterion, visible only when
          this criterion has been overridden. Clicks are isolated from the
          toggle's click handler above. */}
      {isOverridden && (
        <div
          className="mt-2 ml-[30px]"
          onClick={(e) => e.stopPropagation()}
        >
          <label
            htmlFor={`ta-comment-${criterionScoreId}`}
            className="block text-[11px] uppercase tracking-wide text-zinc-500 font-medium mb-1"
          >
            Why did you override?
            <span className="text-zinc-400 normal-case ml-1 tracking-normal">
              (required to approve)
            </span>
          </label>
          <textarea
            id={`ta-comment-${criterionScoreId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            rows={2}
            placeholder="Explain what the AI got wrong or what you noticed…"
            className={`w-full text-sm rounded-md px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border resize-y focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white ${
              missingComment
                ? "border-red-400 dark:border-red-500"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          />
          {missingComment && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
              Add a comment before approving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
