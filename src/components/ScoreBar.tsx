"use client";

export default function ScoreBar({
  score,
  max,
}: {
  score: number;
  max: number;
}) {
  if (max === 0) return null;
  const pct = (score / max) * 100;
  const fill =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="h-[3px] w-full rounded-full bg-zinc-200 dark:bg-zinc-700 mt-1">
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
