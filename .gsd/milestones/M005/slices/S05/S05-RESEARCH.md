# S05 Research — Mobile surfaces for recurrence suggestion and clash advisory

## Summary
- **Requirement support:** S05 advances active requirement **R011** by carrying the truthful predictive-create loop onto the mobile `ShiftEditorSheet` without widening calendar scope.
- **Current gap:** the mobile route and board never compute or pass a recurrence suggestion, never derive `existingShifts` for the sheet, and `ShiftEditorSheet.svelte` currently has only plain recurrence inputs — no suggestion chip, no `clash-advisory`, no suggestion-state diagnostics.
- **Cross-slice constraints already set:**
  - **D064 / MEM094 / MEM095:** recurrence suggestions must come from the same calendar only, using a trailing 30-day window ending at `visibleWeek.endAt`, fail closed to `null`, and expose stable hooks (`data-testid="recurrence-suggestion"`, accept/dismiss buttons, `data-testid="recurrence-field-state"`).
  - **D065:** clash preview is advisory-only, reuses the shared overlap helper, excludes the subject shift for edit/move, and must keep save enabled.
  - **MEM025:** pure cross-surface scheduling rules belong in `@repo/caluno-core`, not duplicated app-locally.

## Recommendation
- Treat this as **targeted research** with one real architectural choice: how mobile gets the 30-day history for recurrence suggestions.
- **Recommended delivery path:**
  1. **Add a separate mobile recurrence-suggestion fetch** alongside the existing visible-week load, mirroring web’s bounded query semantics and returning `null` on timeout/query/malformed rows.
  2. **Thread `existingShifts` from the live mobile schedule** into all sheet entrypoints so clash preview can reuse the same visible-week-only semantics as web.
  3. **Reuse the web DOM contract** in the mobile sheet (`recurrence-suggestion`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, `recurrence-field-state`, `clash-advisory`) so Playwright proof can stay vocabulary-aligned across surfaces.
  4. **Prefer extracting the pure advisory derivation helper into `@repo/caluno-core`** instead of copying web-only logic into mobile.
- **Optional parity-plus path (not required for roadmap acceptance):** use `listTrustedWeekSnapshots()` from the mobile repository as an offline fallback source for the 30-day recurrence history. That is the only local source already capable of spanning multiple weeks.

## Implementation Landscape
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
  - Owns runtime/bootstrap state for the mobile calendar route.
  - Today it computes `board` from `runtimeState.schedule`, but it does **not** derive `existingShifts` or any predictive hint state.
  - Natural place to add:
    - `existingShifts = runtimeState?.schedule.days.flatMap(...) ?? []`
    - nullable `recurrenceSuggestion` state
    - an effect keyed by `viewerId + calendarId + visibleWeek.start + routeMode` that loads/clears the suggestion.
- `apps/mobile/src/lib/offline/transport.ts`
  - Already owns trusted mobile Supabase reads/writes.
  - `loadWeek()` only fetches the visible week, so it cannot support recurrence detection by itself.
  - Natural seam for a new `loadRecurrenceSuggestion({ calendarId, visibleWeekEndAt })` method that mirrors web’s `loadCalendarRecurrenceSuggestion()` query bounds and fail-closed null behavior.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
  - Currently passes only `createPrefill` into the create sheet.
  - Needs to accept/pass both `existingShifts` and `recurrenceSuggestion` to the create `ShiftEditorSheet`.
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`
  - Already mounts edit/move/delete sheets.
  - Needs `existingShifts` threaded into edit/move sheets if mobile should match web’s clash-advisory semantics across all entrypoints.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
  - Biggest UI delta.
  - Currently has draft title/start/end/recurrence fields and create-prefill auto-open logic, but no predictive surfaces.
  - Needs:
    - suggestion lifecycle state (current key, accepted key, dismissed key)
    - suggestion accept/dismiss handlers
    - recurrence field-state diagnostics
    - advisory conflict derivation and rendering
    - resets that preserve truthful behavior across close/reopen/submit.
- `packages/caluno-core/src/schedule/*` + `packages/caluno-core/package.json` + `packages/caluno-core/src/index.ts`
  - Best place to extract the pure `deriveShiftEditorClashes()` rule from web so mobile and web reuse one implementation.
  - If planner chooses this path, web imports/tests need a small repoint.
- `apps/mobile/tests/e2e/fixtures.ts`
  - Already has arrival/prefill helpers, but nothing for predictive surfaces.
  - Needs mobile equivalents of web’s `readCreateShiftRecurrenceSnapshot()` and `readCreateShiftClashAdvisory()`.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts` or a new `apps/mobile/tests/e2e/mobile-predictive.spec.ts`
  - Existing mobile E2E coverage already opens the create sheet and asserts prefill values.
  - A dedicated predictive smoke spec is cleaner than extending `mobile-assembly.spec.ts`.

## Natural Seams
1. **Shared pure helper seam**
   - Extract `deriveShiftEditorClashes` into `@repo/caluno-core` and repoint web.
   - Independent, low-UI-risk, gives both surfaces one overlap rule.
2. **Mobile data seam**
   - Add recurrenceSuggestion loading + `existingShifts` derivation in the mobile route/transport layer.
3. **Mobile sheet UI seam**
   - Render the suggestion chip, accept/dismiss flow, recurrence diagnostics, and clash advisory in `ShiftEditorSheet`.
4. **Verification seam**
   - Add Playwright fixture readers + one targeted predictive smoke spec.

## First Proof
- **Highest-risk unblocker:** mobile has no 30-day history source today. `loadWeek()` only knows the visible week, so recurrence suggestion parity cannot exist until a separate bounded history fetch (or cached multi-week aggregation) is wired.
- **Suggested first proof task:** implement the separate recurrence-suggestion transport + route state plumbing before touching sheet UI polish. Once that exists, clash advisory is mostly prop threading plus pure helper reuse.

## Risks / Constraints
- **Create-prefill coexistence:** `ShiftEditorSheet` already auto-opens on find-time arrival and preserves exact start/end prefill values. Recurrence suggestion must not overwrite those fields; it should only prefill recurrence controls.
- **Close/reopen semantics:** the mobile sheet currently reseeds fields on close and on successful create. If parity with web dismissal behavior is desired, dismissed suggestion state must intentionally survive close/reopen on the same page instance and return only after fresh loader data.
- **Offline truthfulness:** a minimal online-only suggestion path should clear to `null` for `cached-offline`/`trusted-offline` rather than guessing from the visible week. If offline suggestion parity is desired, `listTrustedWeekSnapshots()` is the only existing local cross-week source.
- **Multi-package touch if helper is extracted:** this slice may touch `packages/caluno-core`, `apps/web`, and `apps/mobile`.
- **E2E environment gotcha:** mobile Playwright depends on local Supabase/Docker, and shared seed state mutates across specs (MEM002 / MEM103). Reset the DB before closeout proof.

## Skill Discovery
- **Already installed and relevant:** `accessibility`, `test`, `verify-before-complete`, `frontend-design`.
- **Useful optional external skills if the user wants them later (do not auto-install):**
  - `npx skills add sveltejs/ai-tools@svelte-code-writer` — strongest Svelte-specific result from `npx skills find "Svelte"`.
  - `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` — strongest Playwright-specific result from `npx skills find "Playwright"`.
- **Searched but not recommended for this slice:** Expo / React Native skills exist, but this mobile app is Svelte + Capacitor, not Expo/RN.

## Verification
- `pnpm --dir apps/mobile check`
- If the advisory helper is extracted/shared: reuse or move pure-helper coverage equivalent to `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts` and `apps/web/tests/schedule/conflicts.unit.test.ts`
- Targeted mobile proof:
  - `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/<predictive-spec>.ts`
- Broader mobile regression confidence after the targeted smoke:
  - `pnpm --dir apps/mobile exec playwright test tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts`
