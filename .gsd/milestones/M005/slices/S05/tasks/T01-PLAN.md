---
estimated_steps: 40
estimated_files: 5
skills_used: []
---

# T01: Extract the shared shift-editor clash helper into `@repo/caluno-core` and repoint web

---
estimated_steps: 6
estimated_files: 5
skills_used:
  - test
  - verify-before-complete
---

# T01: Extract the shared shift-editor clash helper into `@repo/caluno-core` and repoint web

## Description

S05 should not copy the web-only clash derivation rule into mobile. Move the pure `deriveShiftEditorClashes()` logic beside `previewShiftConflicts()` and `normalizeShiftDraft()` in the shared core package, export it for both app surfaces, and leave the web app on the shared contract before the mobile sheet starts consuming it.

## Negative Tests

- **Malformed inputs**: blank title, invalid timestamps, and inverted ranges return an empty advisory list instead of throwing.
- **Error paths**: self-exclusion for edit/move must remain intact after the move so unchanged drafts do not self-conflict.
- **Boundary conditions**: touching ranges stay clear, and overlapping shifts from a different calendar stay excluded.

## Steps

1. Add `packages/caluno-core/src/schedule/shift-editor-advisory.ts` with the pure helper and its mode typing, implemented in terms of `normalizeShiftDraft()` and `previewShiftConflicts()`.
2. Export the helper through `packages/caluno-core/src/index.ts` and a package subpath in `packages/caluno-core/package.json` so both apps can import it consistently.
3. Convert `apps/web/src/lib/schedule/shift-editor-advisory.ts` into a thin re-export or otherwise repoint the web dialog to the shared helper without changing the existing DOM contract.
4. Update `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` to keep proving malformed-input suppression, boundary behavior, self-exclusion, and same-calendar scope against the shared helper path.
5. Keep the helper pure and framework-free so mobile can import it directly in T03 without bringing in app-local types or server-only modules.
6. Verify the shared helper through the existing targeted web unit suite before mobile starts depending on it.

## Must-Haves

- [ ] One pure clash-derivation implementation exists in `@repo/caluno-core` for both web and mobile.
- [ ] Web keeps its current advisory semantics and test coverage after repointing.
- [ ] The helper stays typed only in terms of shared schedule contracts, not app-local server modules.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts`

## Inputs

- `apps/web/src/lib/schedule/shift-editor-advisory.ts` — current web-only helper to extract.
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` — targeted contract proof to preserve.
- `packages/caluno-core/src/schedule/conflicts.ts` — shared overlap contract the helper should reuse.
- `packages/caluno-core/src/schedule/recurrence.ts` — shared draft normalization used to fail closed.
- `packages/caluno-core/src/index.ts` — current root export surface.
- `packages/caluno-core/package.json` — subpath exports for direct shared imports.

## Expected Output

- `packages/caluno-core/src/schedule/shift-editor-advisory.ts` — new shared pure advisory helper.
- `packages/caluno-core/src/index.ts` — root export for the shared helper.
- `packages/caluno-core/package.json` — added shared-helper subpath export if needed.
- `apps/web/src/lib/schedule/shift-editor-advisory.ts` — thin re-export or repointed import surface.
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` — preserved contract coverage against the shared helper.

## Inputs

- `apps/web/src/lib/schedule/shift-editor-advisory.ts`
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts`
- `packages/caluno-core/src/schedule/conflicts.ts`
- `packages/caluno-core/src/schedule/recurrence.ts`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/package.json`

## Expected Output

- `packages/caluno-core/src/schedule/shift-editor-advisory.ts`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/package.json`
- `apps/web/src/lib/schedule/shift-editor-advisory.ts`
- `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts`

## Verification

pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts

## Observability Impact

No new runtime surface; this task preserves the shared advisory contract so later mobile/browser diagnostics mean the same thing on both apps.
