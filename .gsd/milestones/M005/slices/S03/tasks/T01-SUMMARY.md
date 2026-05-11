---
id: T01
parent: S03
milestone: M005
key_files:
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
  - supabase/seed.sql
  - apps/web/tests/e2e/fixtures.ts
key_decisions:
  - Added a separate fail-closed recurrence-suggestion loader that queries same-calendar shifts in the trailing 30-day window ending at visibleWeek.endAt and returns null on error, timeout, or malformed rows.
  - Kept the existing Wednesday/Thursday Alpha visible-week proof shifts as standalone singles while converting the seeded Alpha series itself to a truthful weekly pattern for downstream browser suggestion coverage.
duration: 
verification_result: passed
completed_at: 2026-05-11T09:25:31.240Z
blocker_discovered: false
---

# T01: Added a bounded protected-route recurrence suggestion contract and converted the Alpha seed baseline to a truthful weekly pattern.

**Added a bounded protected-route recurrence suggestion contract and converted the Alpha seed baseline to a truthful weekly pattern.**

## What Happened

Added loadCalendarRecurrenceSuggestion() beside the schedule loader in apps/web/src/lib/server/schedule.ts. It performs a second shifts query scoped to the current calendar_id and the trailing 30-day window ending at the resolved visibleWeek.endAt, validates rows before mapping, runs detectRecurrencePattern on the bounded history, and emits a minimal positive-path console.info only when a concrete suggestion exists. The protected calendar page server load now threads this nullable recurrenceSuggestion through the permitted calendar view without changing denied-route behavior. Route unit coverage was expanded to assert the normal schedule query, the bounded suggestion query filters, the positive weekly suggestion payload and log, invalid-week fallback behavior, and fail-closed null results for timeout/error and malformed history rows. The seeded Alpha recurrence baseline in supabase/seed.sql was changed from a daily series to a truthful weekly Monday pattern inside the helper lookback window, while preserving the existing Wednesday/Thursday Alpha visible-week proof shifts as standalone singles so current board/browser fixtures remain stable. The recurrence seed contract test and E2E fixture constants were updated to reflect the weekly suggestion baseline ids, dates, and timing metadata.

## Verification

Ran the task verification suite with pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts. The route tests now prove same-calendar bounded lookback filters, positive suggestion threading/logging, invalid-week fallback behavior, and null fail-closed behavior for history-query timeout/error and malformed rows. The recurrence tests confirm the updated weekly seed baseline ids and dates in supabase/seed.sql.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1715ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `supabase/seed.sql`
- `apps/web/tests/e2e/fixtures.ts`
