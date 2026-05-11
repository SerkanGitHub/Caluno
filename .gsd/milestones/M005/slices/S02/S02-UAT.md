# S02: Implement detectRecurrencePattern and previewShiftConflicts in @repo/caluno-core — UAT

**Milestone:** M005
**Written:** 2026-05-11T09:06:26.577Z

# UAT Type
Developer contract verification via shared-core unit tests (no human runtime/UI proof required for this slice).

# Preconditions
1. Repository is available at `/Users/serkanyeniay/dev/Caluno`.
2. Workspace dependencies are installed.
3. Web Vitest harness is runnable.

# Steps
1. Run `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts tests/schedule/conflicts.unit.test.ts`.
2. Confirm the recurrence suite returns a weekly suggestion when at least three same-weekday, same-hour shifts exist within the anchored 30-day lookback window.
3. Confirm the recurrence suite returns `null` for under-threshold, out-of-window, malformed, inverted, duplicate, split-window, and empty-input cases.
4. Confirm the conflict preview suite returns only overlapping same-calendar shifts for a normalized draft and that results are sorted deterministically.
5. Confirm the conflict preview suite returns `[]` when the draft only touches boundaries, overlaps another calendar, or encounters malformed/inverted existing rows.
6. Run `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts`.
7. Confirm the existing board and server-action tests still pass, proving visible-week conflict behavior did not regress.

# Expected Outcomes
- Both Vitest commands exit with code 0.
- `detectRecurrencePattern` produces a weekly suggestion only for the qualified >=3 historical pattern case.
- `previewShiftConflicts` returns advisory overlap rows only for real same-calendar conflicts and stays empty for clear or fail-closed cases.
- Existing board/server conflict consumers behave unchanged.

# Edge Cases
- Duplicate shift IDs do not produce recurrence suggestions.
- Invalid or inverted timestamps do not produce recurrence suggestions or conflict previews.
- Shifts that end exactly at draft start or start exactly at draft end are not treated as overlaps.
- Cross-calendar shifts are excluded from preview results.

# Not Proven By This UAT
- Web or mobile UI wiring for suggestion chips/advisories.
- User acceptance of the suggestion/advisory experience.
- Accessibility or deployment readiness work planned for later slices.
