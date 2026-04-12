"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AssignmentResponse, SubmissionListItem } from "@/contracts/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

interface AssignmentWithStats extends AssignmentResponse {
  totalCount: number;
  gradedCount: number;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/assignments");
        if (!res.ok) throw new Error("Failed to fetch assignments");
        const data: AssignmentResponse[] = await res.json();

        const withStats = await Promise.all(
          data.map(async (a) => {
            try {
              const subRes = await fetch(`/api/assignments/${a.id}/submissions`);
              if (!subRes.ok) return { ...a, totalCount: 0, gradedCount: 0 };
              const subs: SubmissionListItem[] = await subRes.json();
              const gradedCount = subs.filter(
                (s) => s.status === "graded" || s.status === "reviewed"
              ).length;
              return { ...a, totalCount: subs.length, gradedCount };
            } catch {
              return { ...a, totalCount: 0, gradedCount: 0 };
            }
          })
        );
        setAssignments(withStats);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-zinc-400 text-sm">Loading assignments...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Assignments
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <p className="mb-4">No assignments yet</p>
          <Link
            href="/assignments/new"
            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg px-4 py-2 text-sm font-medium"
          >
            New assignment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Assignments
        </h1>
        <Link
          href="/assignments/new"
          className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg px-4 py-2 text-sm font-medium"
        >
          New assignment
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left text-xs text-zinc-400 uppercase tracking-wide font-medium py-2 pr-4">
              Assignment
            </th>
            <th className="text-left text-xs text-zinc-400 uppercase tracking-wide font-medium py-2 pr-4">
              Submissions
            </th>
            <th className="text-left text-xs text-zinc-400 uppercase tracking-wide font-medium py-2 pr-4">
              Progress
            </th>
            <th className="text-left text-xs text-zinc-400 uppercase tracking-wide font-medium py-2">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr
              key={a.id}
              className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/assignments/${a.id}`}
                  className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  {a.name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-zinc-500">
                {a.totalCount} submissions
              </td>
              <td className="py-3 pr-4">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {a.gradedCount}/{a.totalCount} graded
                </span>
                {a.totalCount > 0 && (
                  <div className="h-[3px] w-24 rounded-full bg-zinc-200 dark:bg-zinc-700 mt-1">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${(a.gradedCount / a.totalCount) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </td>
              <td className="py-3 text-zinc-400">{timeAgo(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
