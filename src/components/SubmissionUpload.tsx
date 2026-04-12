"use client";

import { useState, useRef, useCallback } from "react";
import type {
  SubmissionListItem,
  UploadSubmissionsRequest,
} from "@/contracts/types";
import { extractStudentNames } from "@/lib/name-extractor";

interface SubmissionUploadProps {
  assignmentId: string;
  onUploadComplete: (submissions: SubmissionListItem[]) => void;
}

interface FileEntry {
  id: string;
  file: File;
  content: string;
  fileName: string;
  studentName: string;
}

type UploadState = "idle" | "review" | "done";

const ACCEPTED_EXTENSIONS = ".txt,.pdf,.py,.java,.cpp,.c,.js,.ts,.md";

export default function SubmissionUpload({
  assignmentId,
  onUploadComplete,
}: SubmissionUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [patternDetected, setPatternDetected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const readPromises = fileArray.map(
      (file) =>
        new Promise<{ file: File; content: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file, content: reader.result as string });
          reader.onerror = () => resolve({ file, content: "" });
          reader.readAsText(file);
        })
    );

    const results = await Promise.all(readPromises);
    const fileNames = results.map((r) => r.file.name);
    const extracted = extractStudentNames(fileNames);

    const newEntries: FileEntry[] = results.map((r, i) => ({
      id: crypto.randomUUID(),
      file: r.file,
      content: r.content,
      fileName: r.file.name,
      studentName: extracted[i].studentName,
    }));

    setPatternDetected(extracted.length > 0 ? extracted[0].patternDetected : null);
    setEntries(newEntries);
    setUploadError(null);
    setState("review");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleNameChange = useCallback((id: string, newName: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, studentName: newName } : entry
      )
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((entry) => entry.id !== id);
      if (updated.length === 0) {
        setState("idle");
      }
      return updated;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setEntries([]);
    setPatternDetected(null);
    setUploadError(null);
    setState("idle");
  }, []);

  const handleUploadAll = useCallback(async () => {
    setUploading(true);
    setUploadError(null);

    const body: UploadSubmissionsRequest = {
      assignmentId,
      files: entries.map((e) => ({
        studentIdentifier: e.studentName,
        fileName: e.fileName,
        fileContent: e.content,
      })),
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data: SubmissionListItem[] = await res.json();
      setUploadedCount(entries.length);
      setState("done");
      onUploadComplete(data);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [assignmentId, entries, onUploadComplete]);

  const handleAddMore = useCallback(() => {
    setState("idle");
    setEntries([]);
    setPatternDetected(null);
    setUploadError(null);
  }, []);

  // ─── Idle state: Drop zone ───────────────────────────────
  if (state === "idle") {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div
          className={`m-4 p-10 text-center border-[1.5px] border-dashed rounded-[10px] cursor-pointer transition-colors ${
            dragOver
              ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Upload icon */}
          <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-500"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          </div>

          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Drop student submissions here
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            PDF, TXT, or code files. Names auto-extracted from filenames.
          </p>

          <button
            type="button"
            className="mt-3 text-xs font-medium border border-zinc-300 dark:border-zinc-600 rounded-lg px-3.5 py-1.5 text-zinc-500"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            or choose files
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    );
  }

  // ─── Review state: File list with editable names ─────────
  if (state === "review") {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {/* Pattern detection banner */}
        {patternDetected && (
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              Detected naming pattern: {patternDetected} — student names
              auto-filled
            </span>
          </div>
        )}

        {/* Header row */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
            Review submissions
          </span>
          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs px-2 py-0.5 rounded-full">
            {entries.length} file{entries.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2.5 px-4 py-1.5">
          <span />
          <span className="text-[11px] text-zinc-400">Filename</span>
          <span className="text-[11px] text-zinc-400">Student name</span>
          <span />
        </div>

        {/* File rows */}
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className="group grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2.5 items-center px-4 py-2 border-b border-zinc-100 dark:border-zinc-800"
          >
            <span className="text-[11px] text-zinc-400 font-mono text-right">
              {idx + 1}
            </span>
            <span className="text-xs text-zinc-500 font-mono truncate">
              {entry.fileName}
            </span>
            <input
              type="text"
              value={entry.studentName}
              onChange={(e) => handleNameChange(entry.id, e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-white outline-none"
            />
            <button
              type="button"
              onClick={() => handleRemove(entry.id)}
              className="opacity-0 group-hover:opacity-70 flex items-center justify-center rounded transition-opacity"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-500"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Footer */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-400">
            {entries.length} file{entries.length !== 1 ? "s" : ""} ready to
            upload
          </span>
          <div className="flex gap-2 items-center">
            {uploadError && (
              <span className="text-red-500 text-xs mr-2">{uploadError}</span>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3.5 py-1.5 text-[13px] text-zinc-500 bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadAll}
              disabled={uploading}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg px-4 py-1.5 text-[13px] font-medium disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload all"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Done state: Success confirmation ────────────────────
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Green check circle */}
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="#16a34a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[13px] text-zinc-900 dark:text-zinc-100">
            {uploadedCount} submission{uploadedCount !== 1 ? "s" : ""} uploaded{" "}
            <span className="text-zinc-500">— ready to grade</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddMore}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          + Add more
        </button>
      </div>
    </div>
  );
}
