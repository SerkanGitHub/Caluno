---
phase: verification
milestone: M005
title: Predictive assistance and release hardening
generated: 2026-05-12T00:00:00Z
status: failed
---

# M005 Verification Failure Summary

## Outcome
Milestone M005 is **not ready for completion**.

## What passed
- `gsd_milestone_status` shows all six slices (`S01`–`S06`) are marked `complete`.
- Milestone-scoped commit evidence still shows non-`.gsd/` implementation files changed, including:
  - `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
  - `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
  - `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - `apps/web/tests/e2e/fixtures.ts`
- Slice summary and UAT artifacts exist for all six slices under `.gsd/milestones/M005/slices/`.
- Predictive-assistance scope remains evidenced by slice summaries and shipped decisions (`D063`–`D067`).

## Blocking verification failures
Fresh milestone-closeout regression evidence failed:

### Fresh command run
```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

### Result
- Exit code: `1`
- Passed: `6`
- Failed: `3`
- Did not run after failure cutoff: `8`

### Failing specs
1. `apps/web/tests/e2e/auth-groups-access.spec.ts:45`
   - `join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out`
   - Expected `data-testid="groups-shell"` to contain `onboarding-empty`, but it rendered the trusted-online shell state instead.
2. `apps/web/tests/e2e/calendar-shifts.spec.ts:339`
   - `touching-boundary create drafts stay advisory-free before submit`
   - The create dialog reported an advisory overlap count of `1` when the boundary-touching case should remain advisory-free.
3. `apps/web/tests/e2e/find-time.spec.ts:21`
   - `permitted member sees ranked top picks before the lighter browse inventory on the real find-time route`
   - Expected `10 truthful windows`, but the page rendered `8 truthful windows`.

Evidence file: `.gsd/exec/9f440073-c561-43db-94f3-d3c81379dfd3.stdout`

## Why completion is blocked
- Launch-hardening is not re-proven milestone-wide with a clean fresh regression run.
- Trust/authorization surfaces are not cleanly re-verified because an auth/onboarding E2E failed.
- The predictive clash-advisory surface is not cleanly re-verified because the touching-boundary advisory-free spec failed.
- Requirement `R011` currently remains marked `validated` in `.gsd/REQUIREMENTS.md`, but fresh closeout evidence is not strong enough to re-affirm milestone-closeout validation without fixing the failing regression set.

## Next attempt should
1. Fix the three failing web E2E regressions above.
2. Re-run the full web regression command until it passes cleanly.
3. Re-check whether `R011` validation text still matches the fresh evidence.
4. Only then retry milestone completion.
