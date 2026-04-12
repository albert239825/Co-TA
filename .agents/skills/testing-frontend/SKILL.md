# Testing Co-TA Frontend

## Environment Setup

1. `cd ~/repos/Co-TA && npm run dev` — starts Next.js dev server on port 3000
2. No backend needed for frontend testing — all pages render against mock data in `src/lib/mock-data.ts`
3. Dark mode follows system preference (media strategy, not class strategy)

## Key Test Scenarios

### Triage Table (Screen 3) — SSE Animation
- Route: `/assignments/a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Click "Grade all pending" to trigger mock SSE stream
- The mock stream uses `setTimeout` chains (~5s total), NOT real EventSource
- Mock stream URL uses `mock://` scheme — if you see real fetch errors to `/api/grade/batch`, the mock fallback might be broken
- Wait ~8 seconds after clicking for animation to complete
- Verify: pending rows get scores, status changes to "Graded", stat cards update, button re-enables
- Second click should be a no-op (no pending rows left)

### Review Screen (Screen 4) — Criterion Toggle
- Route: `/assignments/[id]/submissions/[subId]`
- Click any criterion row to toggle earned/not-earned
- Verify: circle icon toggles (green check / red X), problem score updates, total score updates instantly
- The PATCH fetch fires in background — check browser console for mock log
- Toggle back should revert all scores to original values
- "TA override" badge should appear/update on toggled criteria

### Rubric Builder (Screen 2) — Auto-Focus
- Route: `/assignments/new`
- Add Problem 2 via "Add problem" button
- Then click "+ Add criterion" on Problem 1
- Verify: the new criterion input on Problem 1 receives focus (not Problem 2)
- This tests the `focusProblemIdx` state tracking

### Assignment List (Screen 1)
- Route: `/`
- Should show HW4 with 10 submissions, 7/10 graded progress bar
- "New assignment" button navigates to rubric builder

## Common Issues

- If `next build` fails on `@/contracts/types`, check that `tsconfig.json` has `@/contracts/*` path alias pointing to `./contracts/*`
- The `contracts/` directory is at repo root, NOT under `src/`
- SVG icons in `CriterionToggle` use `currentColor` — if colors look wrong in dark mode, check Tailwind text color classes
- Mock SSE `batch_complete` should call `stopStream()` not bare `setIsStreaming(false)` to clean up timeout refs

## Devin Secrets Needed

None — frontend testing uses only mock data, no API keys required.
