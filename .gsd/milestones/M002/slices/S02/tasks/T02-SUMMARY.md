---
id: T02
parent: S02
milestone: M002
key_files:
  - apps/web/src/lib/server/find-time.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
key_decisions:
  - Kept `search.windows` as a compatibility surface for the current UI, but now derive it explicitly as `topPicks` followed by `browseWindows` so downstream UI work can trust the shortlist/browse split without recomputing ranking client-side.
duration: 
verification_result: mixed
completed_at: 2026-04-18T19:44:36.676Z
blocker_discovered: false
---

# T02: Hardened the find-time route contract so ready responses ship explicit top-pick and browse payloads with fail-closed route proofs.

**Hardened the find-time route contract so ready responses ship explicit top-pick and browse payloads with fail-closed route proofs.**

## What Happened

I verified the local reality first and found that T01 had already introduced most of the ranked payload fields in `loadFindTimeSearchView()`, so the main remaining risk in T02 was contract drift rather than missing server plumbing. I tightened `apps/web/src/lib/server/find-time.ts` by splitting ranked windows through an explicit helper that returns `topPicks`, `browseWindows`, and a compatibility `windows` array ordered as shortlist-first followed by browse results, keeping the ready payload internally consistent if the ranking implementation changes later. I then expanded `apps/web/tests/routes/find-time-routes.unit.test.ts` to prove the protected route now returns separate ranked shortlist and browse arrays, preserves explicit metadata for ready/no-shortlist cases, denies out-of-scope calendars before any trusted query runs, and fails closed on malformed trusted busy rows instead of shaping guessed shortlist explanations. I did not need to materially change `+page.server.ts` because it already preserved the protected route and denied-state conventions by delegating to the server contract. No plan-invalidating blocker was discovered.

## Verification

Task verification passed with the route, matcher, and member-availability Vitest suites, with `pnpm --dir apps/web check`, and with the required grep proof showing the shortlist/browse contract fields in the protected server payload. I also ran the slice-level Supabase reset plus Playwright find-time spec: it still fails, but the failure remains the already-known stale browser assertion that expects chronological window indexes instead of the ranked order now emitted by the protected route. That failure is downstream UI/proof follow-up for the slice, not a server-contract regression introduced here.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/routes/find-time-routes.unit.test.ts tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts` | 0 | ✅ pass | 1299ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3083ms |
| 3 | `rg -n "topPicks|browseWindows|blockedMembers|nearbyConstraints" apps/web/src/lib/server/find-time.ts apps/web/src/routes/'(app)'/calendars/'[calendarId]'/find-time/+page.server.ts` | 0 | ✅ pass | 10ms |
| 4 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 1 | ❌ fail | 31100ms |

## Deviations

Local reality differed slightly from the written plan because T01 had already added the `topPicks` and `browseWindows` fields to the server contract. Instead of reworking `+page.server.ts`, I focused T02 on hardening the ready-payload ordering invariant in `find-time.ts` and on extending the protected-route proof surface to cover shortlist separation, empty-shortlist ready states, malformed trusted rows, and out-of-scope denial.

## Known Issues

`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` still fails because `tests/e2e/find-time.spec.ts` asserts chronological card indexes (`find-time-window-0`, etc.) while the protected route now returns ranked windows. The failure output shows the first rendered card is now a later, higher-ranked shared window, which matches the server contract and should be updated in the follow-on UI proof task rather than rolled back here.

## Files Created/Modified

- `apps/web/src/lib/server/find-time.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`
