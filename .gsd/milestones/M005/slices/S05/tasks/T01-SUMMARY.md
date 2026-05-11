---
id: T01
parent: S05
milestone: M005
key_files:
  - packages/caluno-core/src/schedule/shift-editor-advisory.ts
  - packages/caluno-core/src/index.ts
  - packages/caluno-core/package.json
  - apps/web/src/lib/schedule/shift-editor-advisory.ts
  - apps/web/tests/schedule/shift-editor-advisory.unit.test.ts
key_decisions:
  - Moved `deriveShiftEditorClashes()` into `@repo/caluno-core` beside the shared recurrence/conflict utilities and exposed it via a dedicated `@repo/caluno-core/schedule/shift-editor-advisory` subpath.
  - Kept `apps/web/src/lib/schedule/shift-editor-advisory.ts` as a one-line re-export so the existing web import surface remains stable while tests prove the shared path directly.
duration: 
verification_result: passed
completed_at: 2026-05-11T14:10:30.798Z
blocker_discovered: false
---

# T01: Extracted `deriveShiftEditorClashes()` into `@repo/caluno-core` and repointed web plus its contract test to the shared helper.

**Extracted `deriveShiftEditorClashes()` into `@repo/caluno-core` and repointed web plus its contract test to the shared helper.**

## What Happened

Added a new pure shared helper at `packages/caluno-core/src/schedule/shift-editor-advisory.ts` that derives shift-editor clash advisories from shared `normalizeShiftDraft()` and `previewShiftConflicts()` logic, typed only against shared schedule contracts. Exported the helper from `packages/caluno-core/src/index.ts` and added a matching `./schedule/shift-editor-advisory` package subpath in `packages/caluno-core/package.json` so both apps can import it consistently. Replaced the former web-only implementation in `apps/web/src/lib/schedule/shift-editor-advisory.ts` with a thin re-export to preserve the current web DOM-facing import surface, and updated `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` to import the shared helper and shared `CalendarShift` type directly. The preserved test coverage continues to prove malformed-input suppression, touching-range boundaries, self-exclusion during edit/move, and same-calendar-only overlap filtering against the new shared implementation.

## Verification

Ran the targeted web unit suite against the shared helper import path: `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts`. The suite passed with 3/3 tests, confirming malformed inputs fail closed, touching ranges stay clear, current-shift self-exclusion still works for edit/move flows, and overlapping shifts from a different calendar remain excluded.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts` | 0 | ✅ pass | 1517ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/src/schedule/shift-editor-advisory.ts`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/package.json`
- `apps/web/src/lib/schedule/shift-editor-advisory.ts`
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts`
