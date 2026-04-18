"use client";

import { useEffect, useRef, useState } from "react";
import type { ModelInfo } from "@/contracts/types";

interface ModelPickerProps {
  /** Current selection. null → the system default (rendered as "Default"). */
  selectedModelId: string | null;
  /** Fired when the TA picks a new model. Parent persists. */
  onChange: (newModelId: string | null) => void;
  /** When true, disables the trigger button (e.g. during a PATCH in flight). */
  disabled?: boolean;
}

/**
 * Per-assignment model picker. Fetches the locked model registry from
 * GET /api/models on mount and renders a lightweight popover. The parent
 * owns the selectedModelId — this component only signals changes.
 */
export default function ModelPicker({
  selectedModelId,
  onChange,
  disabled = false,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch the model registry once. This is a small static payload.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/models");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          models: ModelInfo[];
          defaultModelId: string;
        };
        if (cancelled) return;
        setModels(data.models);
        setDefaultModelId(data.defaultModelId);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Label for the trigger button. "Default" when no explicit choice; the
  // chosen model's displayName otherwise.
  const selected = models?.find((m) => m.id === selectedModelId) ?? null;
  const defaultModel = models?.find((m) => m.id === defaultModelId) ?? null;
  const triggerLabel =
    selected?.displayName ??
    (defaultModel ? `Default · ${defaultModel.displayName}` : "Default");

  function handlePick(id: string | null) {
    setOpen(false);
    if (id !== selectedModelId) {
      onChange(id);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || !!loadError}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1.5"
        title={loadError ? `Model list failed to load: ${loadError}` : undefined}
      >
        <svg
          viewBox="0 0 12 12"
          className="w-3 h-3 text-zinc-500"
          aria-hidden
        >
          <circle cx="6" cy="6" r="1.4" fill="currentColor" />
          <circle cx="6" cy="2.25" r="1" fill="currentColor" />
          <circle cx="6" cy="9.75" r="1" fill="currentColor" />
          <circle cx="2.25" cy="6" r="1" fill="currentColor" />
          <circle cx="9.75" cy="6" r="1" fill="currentColor" />
        </svg>
        <span className="truncate max-w-[180px]">{triggerLabel}</span>
        <svg viewBox="0 0 12 12" className="w-3 h-3 text-zinc-400" aria-hidden>
          <path
            d="M3 4.5L6 7.5L9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && models && (
        <div
          role="listbox"
          aria-label="Grading model"
          className="absolute right-0 z-20 mt-1 w-[320px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-1"
        >
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-zinc-400 font-medium">
            Grading model
          </div>
          <button
            type="button"
            role="option"
            aria-selected={selectedModelId === null}
            onClick={() => handlePick(null)}
            className={`w-full text-left px-2 py-2 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
              selectedModelId === null
                ? "bg-zinc-50 dark:bg-zinc-800"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                Default
              </span>
              {defaultModel && (
                <span className="text-[11px] text-zinc-400">
                  {defaultModel.displayName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Use the system default. Changes as the default is updated.
            </p>
          </button>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          {models.map((model) => {
            const isSelected = selectedModelId === model.id;
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handlePick(model.id)}
                className={`w-full text-left px-2 py-2 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  isSelected ? "bg-zinc-50 dark:bg-zinc-800" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {model.displayName}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                    {model.provider}
                  </span>
                </div>
                {model.description && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {model.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
