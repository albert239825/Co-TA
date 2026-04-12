"use client";

interface CriterionToggleProps {
  criterionScoreId: string;
  description: string;
  points: number;
  earned: boolean;
  aiFeedback: string;
  overrideScore: number | null;
  onToggle: (criterionScoreId: string, newEarned: boolean) => void;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        fill="none"
        stroke="#16a34a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3">
      <path
        d="M3 3L9 9M9 3L3 9"
        fill="none"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinecap="round"
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
  onToggle,
}: CriterionToggleProps) {
  return (
    <div
      className="flex gap-2.5 py-2 px-1 items-start cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-md transition-colors"
      onClick={() => onToggle(criterionScoreId, !earned)}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform hover:scale-110 ${
          earned
            ? "bg-emerald-100 dark:bg-emerald-900"
            : "bg-red-100 dark:bg-red-900"
        }`}
      >
        {earned ? <CheckIcon /> : <XIcon />}
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
        {overrideScore !== null && (
          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md mt-1">
            TA override: awarded {overrideScore} pts
          </span>
        )}
      </div>
    </div>
  );
}
