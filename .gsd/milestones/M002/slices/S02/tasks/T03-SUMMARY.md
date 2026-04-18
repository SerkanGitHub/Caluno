---
id: T03
parent: S02
milestone: M002
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/find-time.spec.ts
  - .gsd/DECISIONS.md
key_decisions:
  - D041 — keep Top picks as the high-density explanation surface and browse windows as the lighter truthful inventory, with stable DOM hooks on both layers for browser proof and future inspection.
duration: 
verification_result: passed
completed_at: 2026-04-18T19:56:21.404Z
blocker_discovered: false
---

# T03: Rendered ranked Top picks explanations on /find-time and proved shortlist, browse, denial, and offline flows in the browser.

**Rendered ranked Top picks explanations on /find-time and proved shortlist, browse, denial, and offline flows in the browser.**

## What Happened

I redesigned `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` so the ready state now renders a distinct Top picks surface before the browse inventory, with richer shortlist cards that show free members, blocked-member summaries, nearby leading/trailing constraint explanations, and stable browser-visible ranking/diagnostic data attributes. I kept denied, timeout, malformed, no-results, and offline-unavailable surfaces explicit and fail closed, while making the browse section intentionally lighter-weight so it stays scan-friendly and does not duplicate the full shortlist explanation block. I updated `apps/web/tests/e2e/fixtures.ts` to reflect the real ranked contract exposed by the seeded route, added helper readers for top-pick and browse-card snapshots, and rewrote `apps/web/tests/e2e/find-time.spec.ts` so the browser proof now verifies shortlist order, richer explanation fallback on fully-free top picks, compact browse summaries on lower-ranked windows, blocked-member nearby-edge summaries on a focused browse card, explicit denial on an unauthorized calendar, and offline fail-closed behavior. I also recorded D041 so downstream tasks can rely on the rich-shortlist/light-browse split plus stable DOM hooks as the intended recommendation-surface pattern.

## Verification

Verified the full slice bar with `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`, `pnpm --dir apps/web check`, and `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`; all passed. I also exercised the live route manually via the browser tools against a dev server started with the same local public Supabase env that Playwright uses, then confirmed the top-pick and browse surfaces plus clean console/network state with targeted DOM assertions.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts` | 0 | ✅ pass | 1515ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3361ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 0 | ✅ pass | 34542ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/find-time.spec.ts`
- `.gsd/DECISIONS.md`
