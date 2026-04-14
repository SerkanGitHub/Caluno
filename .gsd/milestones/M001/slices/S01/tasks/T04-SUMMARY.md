---
id: T04
parent: S01
milestone: M001
key_files:
  - apps/web/playwright.config.ts
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/auth-groups-access.spec.ts
  - apps/web/package.json
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Assert unauthorized existing calendar ids against the shipped fail-closed route contract (`calendar-missing` / `calendar-lookup`) because `/calendars/[calendarId]` resolves only from the trusted parent-scope inventory and intentionally avoids exposing out-of-scope membership detail.
  - Keep the Playwright harness serial with retained failure artifacts and fixture-aware phase diagnostics so auth, onboarding, and access-control failures stay attributable under the slice's local load profile.
duration: 
verification_result: passed
completed_at: 2026-04-14T22:06:42.994Z
blocker_discovered: false
---

# T04: Added seeded Playwright proof for sign-in, join onboarding, explicit denied calendar access, and post-logout protection.

**Added seeded Playwright proof for sign-in, join onboarding, explicit denied calendar access, and post-logout protection.**

## What Happened

Implemented a local Supabase-aware Playwright harness for the web app by adding `apps/web/playwright.config.ts`, seeded E2E fixtures, and a serial browser spec that exercises the real sign-in, permitted calendar, denied calendar, join-code error, valid join, reload, and logout flows against `supabase db reset --local`. The harness captures trace/video/screenshot artifacts on failure and attaches flow diagnostics with the active phase plus the seeded fixture ids so later debugging can localize auth, onboarding, protected-load, or denied-path breaks quickly. During verification I found that the cold-start Vite dev server could reset the email field on the freshly loaded sign-in page before submit; I fixed that in the test harness with a short post-navigation settle and field read-back assertions rather than changing the auth flow. I also aligned the unauthorized-calendar assertion with the shipped protected-route contract: out-of-scope calendar ids intentionally fail closed as `calendar-missing` / `calendar-lookup` from the trusted parent scope rather than exposing cross-group membership detail.

## Verification

Passed the full slice verification set after adding the Playwright harness: `pnpm -C apps/web check`, `pnpm -C apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts`, `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts`, and `supabase db reset --local --yes && pnpm -C apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts`. The browser proof now covers both a permitted calendar path and an explicit denied surface for an unauthorized calendar URL, plus invalid join-code handling, successful join redemption, reload with the same session, and redirect-to-sign-in after logout. Failure diagnostics are retained as Playwright trace/video/screenshot artifacts and fixture-aware flow-diagnostics attachments.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm -C apps/web check` | 0 | ✅ pass | 2641ms |
| 2 | `pnpm -C apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts` | 0 | ✅ pass | 1989ms |
| 3 | `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` | 0 | ✅ pass | 768ms |
| 4 | `supabase db reset --local --yes && pnpm -C apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts` | 0 | ✅ pass | 34246ms |

## Deviations

Added a brief post-navigation settle in the Playwright sign-in helper because the first cold-start run against a freshly started Vite dev server could clear the email field before the submit POST was issued. This was a local test-harness stabilization change, not a slice replan.

## Known Issues

None.

## Files Created/Modified

- `apps/web/playwright.config.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/package.json`
- `.gsd/KNOWLEDGE.md`
