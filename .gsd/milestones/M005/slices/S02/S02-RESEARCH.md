# S02 Research — Implement detectRecurrencePattern and previewShiftConflicts in `@repo/caluno-core`

## Summary
- S02 is targeted research: the codebase already has the right seams in `packages/caluno-core/src/schedule/recurrence.ts:81` and `packages/caluno-core/src/schedule/conflicts.ts:43`, with app-local web shims at `apps/web/src/lib/schedule/recurrence.ts:1` and `apps/web/src/lib/schedule/conflicts.ts:1`.
- R011 is the active requirement this slice supports. The value of S02 is establishing one pure shared contract for both helpers so S03–S05 can consume identical behavior across web and mobile.
- Memory hits reinforced the existing project pattern: shared cross-surface schedule rules belong in `@repo/caluno-core` (MEM025), predictive scope is fixed by D063/M005 (MEM088), and conflict logic must stay advisory/non-blocking rather than becoming write policy (MEM054).

## Requirement and constraint notes
- **R011** is not validated by S02 alone, but S02 is the first executable support slice for it.
- The milestone brief fixes the feature boundaries: `detectRecurrencePattern` suggests weekly recurrence from recent history; `previewShiftConflicts` previews overlaps without blocking saves.
- No backend or migration work is needed here; both helpers should remain pure TypeScript over existing `CalendarShift` / `NormalizedScheduleShiftDraft` inputs.

## Skill discovery
- Installed project skills already cover generic testing/review, but none are more directly relevant than the existing local schedule-helper patterns for this slice.
- External skill search only surfaced one promising add-on: `npx skills add antfu/skills@vitest` for extra Vitest authoring guidance.
- No meaningful `rrule`-specific skill appeared, which matches the local reality: recurrence expansion already exists here, so this slice is mostly project-specific TypeScript work rather than unfamiliar library integration.

## Implementation landscape
- `packages/caluno-core/src/schedule/types.ts:63` defines `NormalizedScheduleShiftDraft`; `packages/caluno-core/src/schedule/types.ts:112` defines `CalendarShift`. Those match the milestone-brief helper inputs directly.
- `packages/caluno-core/src/schedule/recurrence.ts:81-205` already owns draft normalization and recurrence math. Extending this file avoids needless export churn because `packages/caluno-core/package.json:21` and `packages/caluno-core/src/index.ts:14` already expose `./schedule/recurrence`.
- `packages/caluno-core/src/schedule/conflicts.ts:43-228` already owns overlap normalization, sorting, and pair detection. Extending this file likewise avoids new export/shim work because `packages/caluno-core/package.json:19`, `packages/caluno-core/src/index.ts:12`, and `apps/web/src/lib/schedule/conflicts.ts:1` already route the API through.
- Unit coverage for these shared helpers already lives in `apps/web/tests/schedule/recurrence.unit.test.ts:18` and `apps/web/tests/schedule/conflicts.unit.test.ts:4`; there is no separate `packages/caluno-core` test harness today.

## Recommendation
- Add `detectRecurrencePattern(shifts: CalendarShift[])` to `packages/caluno-core/src/schedule/recurrence.ts`, but make the 30-day lookback deterministic by anchoring it to the latest valid shift in the provided array rather than `Date.now()`. The milestone brief gives a fixed signature, and a live clock would make unit tests brittle.
- For recurrence detection, ignore malformed/inverted/duplicate shifts and return `null` when valid evidence drops below threshold. That matches the codebase’s current fail-closed posture in schedule helpers.
- Group recurrence candidates by **weekday + exact start/end time**, not just weekday + start hour. The acceptance wording says “same-weekday-same-hour”, but downstream UI needs truthful recurrence prefill for a concrete shift window; collapsing `09:00–12:00` and `09:00–17:00` would over-suggest.
- Return enough structured data for S03 to render a suggestion chip without re-deriving history. Minimal useful shape: `cadence: 'weekly'`, `interval: 1`, exemplar `startAt`/`endAt`, and either `matchCount` or `matchingShiftIds`. If multiple surfaces will consume it, add a named exported type; otherwise keep the type local to `recurrence.ts`.
- Add `previewShiftConflicts(draft: NormalizedScheduleShiftDraft, existingShifts: CalendarShift[])` to `packages/caluno-core/src/schedule/conflicts.ts` and return the sorted overlapping `CalendarShift[]`.
- Reuse the current overlap rule from conflicts (`left.startAt < right.endAt && right.startAt < left.endAt`) and the existing sort order so S04’s advisory ordering matches visible-week conflict surfaces.
- Filter defensively inside `previewShiftConflicts`: same `calendarId`, valid timestamp range only, and no assumption that caller already narrowed to ±7 days. The ±7-day bound is mainly a loader/query optimization for later slices; correctness comes from overlap math, not the window size.
- Do not bake edit-mode self-exclusion into the core helper yet: `NormalizedScheduleShiftDraft` has no shift id. If S04 later uses the helper for edits, the caller should filter the edited shift out before calling core.

## Natural seams
1. `packages/caluno-core/src/schedule/types.ts` only if exported suggestion types are needed.
2. `packages/caluno-core/src/schedule/recurrence.ts` plus `apps/web/tests/schedule/recurrence.unit.test.ts` for recurrence threshold/anchor/ignore-invalid coverage.
3. `packages/caluno-core/src/schedule/conflicts.ts` plus `apps/web/tests/schedule/conflicts.unit.test.ts` for overlap preview coverage.

## First proof
- Write the recurrence tests first. The only real hidden design choice in this slice is the deterministic 30-day anchor; once that contract is locked, implementation is low-risk.
- Then implement conflict preview by extracting/reusing the existing overlap semantics already proven by visible-week conflict tests.

## Verification
- `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts tests/schedule/conflicts.unit.test.ts`
- Optional regression sweep after implementation: `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts`

## Watch-outs / forward intelligence
- Current conflict code depends on day buckets and `dayKey` validation (`conflicts.ts:84-189`); preview works on a flat shift list, so factor shared normalization/overlap helpers instead of forcing `deriveDayConflicts` onto the new use case.
- Existing schedule helpers consistently operate on ISO strings and deterministic parsing (`recurrence.ts`, `conflicts.ts`). Keep that convention in the new helpers so web and mobile do not drift by local timezone.
- Because S03 and S05 will consume the same outputs, keep the new core APIs data-first. Avoid app-specific formatting, translated text, or Svelte-oriented shapes in `@repo/caluno-core`.
