"use client";

interface CriterionToggleProps {
  criterionScoreId: string;
  description: string;
  points: number;
  earned: boolean;
  aiFeedback: string;
  overrideScore: number | null;
  // True when the AI flagged this criterion as uncertain; renders the yellow
  // "needs manual review" treatment. The criterion is forced to earned=false
  // at grade time so the score starts at 0 until the TA reviews/overrides.
  needsReview: boolean;
  onToggle: (criterionScoreId: string, newEarned: boolean) => void;
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
  needsReview,
  onToggle,
}: CriterionToggleProps) {
  // The yellow "needs review" treatment only applies until the TA interacts
  // with the row. Once they've explicitly overridden (overrideScore set),
  // the blue "TA override" chip takes precedence — the flag has served its
  // purpose.
  const showNeedsReview = needsReview && overrideScore === null;

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
    <div
      className={`flex gap-2.5 py-2 px-1 items-start cursor-pointer rounded-md transition-colors ${rowHighlight}`}
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
          {overrideScore !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
              TA override: awarded {overrideScore} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
