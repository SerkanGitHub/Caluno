---
id: T02
parent: S04
milestone: M005
key_files:
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/app.css
  - apps/web/src/lib/schedule/shift-editor-advisory.ts
  - apps/web/tests/schedule/shift-editor-advisory.unit.test.ts
key_decisions:
  - Derived live advisory state from controlled draft fields through a pure helper that reuses normalizeShiftDraft() and previewShiftConflicts() so the dialog matches the shared overlap contract.
  - Kept the clash surface warning-only with data-testid="clash-advisory" and explicit close/success draft resets so SvelteKit's update({ reset: false }) does not leave stale advisory state behind.
duration: 
verification_result: passed
completed_at: 2026-05-11T10:43:23.192Z
blocker_discovered: false
---

# T02: Added live warning-only clash advisory state to the shared web shift editor with self-exclusion, stale-state resets, and unit coverage for invalid/boundary cases.

**Added live warning-only clash advisory state to the shared web shift editor with self-exclusion, stale-state resets, and unit coverage for invalid/boundary cases.**

## What Happened

Reworked the shared web ShiftEditorDialog to use controlled local title/start/end draft state instead of submit-only derived values, then threaded that live draft through a new deriveShiftEditorClashes() helper that normalizes the draft, suppresses malformed/inverted inputs to no preview, and excludes the current shift ID during edit and move flows before calling the shared previewShiftConflicts() helper. Added a warning-only advisory article with data-testid="clash-advisory", overlap metadata, calm explanatory copy, and per-conflict title/window details while leaving submit fully enabled. Also reset the advisory-bearing draft state on dialog close and on successful create/edit/move completion so SvelteKit's non-resetting form update path does not leak stale overlap warnings into the next session, and added matching warning-surface styling in app.css.

## Verification

Verified the finished dialog and helper with pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json, pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts, and pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts. The final svelte-check run reported 0 errors and 0 warnings, the shared conflicts contract test suite passed, and the new advisory helper test suite passed for malformed-input suppression, touching-boundary clear behavior, same-calendar scope, and self-exclusion in edit/move flows.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json` | 0 | ✅ pass | 3412ms |
| 2 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts` | 0 | ✅ pass | 1806ms |
| 3 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts` | 0 | ✅ pass | 1838ms |

## Deviations

Added a small pure advisory helper and focused unit test so invalid-draft suppression and self-exclusion could be verified directly in Node-based Vitest without introducing a new component-test harness.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/app.css`
- `apps/web/src/lib/schedule/shift-editor-advisory.ts`
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts`
