"use client";

export default function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3.5 py-2 min-w-[72px] text-center">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">
        {label}
      </p>
      <p className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
        {value}
      </p>
    </div>
  );
}
