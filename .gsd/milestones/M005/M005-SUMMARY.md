---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
verification_passed: false
verified_at: 2026-05-13T00:00:00Z
---

# M005: Predictive assistance and release hardening

**Milestone M005 verification FAILED — not complete.**

## Verification Summary

- **Duplicate completion guard:** `gsd_milestone_status` reports milestone `M005` is still `active`; all six slices (`S01`–`S06`) are `complete`.
- **Code changes exist:** `HEAD` equals `main`, so this closeout used self-diff commit evidence. Verified milestone/task commits touched non-`.gsd/` implementation files, including:
  - `4c3b6e0` — `packages/caluno-core/src/schedule/recurrence.ts`
  - `b82fd04` — `packages/caluno-core/src/schedule/conflicts.ts`
  - `017be51` — `apps/web/src/lib/server/schedule.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
  - `f12ede4` — `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
  - `f4394dc` — `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `ShiftDayColumn.svelte`, `ShiftCard.svelte`
  - `877a164` — `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/lib/schedule/shift-editor-advisory.ts`
  - `854ca0a` — `packages/caluno-core/src/schedule/shift-editor-advisory.ts`
  - `f5872d5` — `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`, `apps/mobile/src/lib/components/calendar/shift-editor-predictive.ts`
  - `d5882d7` — typed web route-state diagnostics in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- **Fresh regression evidence:** Ran `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts tests/e2e/calendar-shifts.spec.ts tests/e2e/find-time.spec.ts`.
  - Supabase reset: **PASS**
  - Playwright targeted regression: **FAIL** (`8 passed`, `2 failed`, `3 did not run`)

## Success Criteria Results

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.**
  - Slice evidence remains consistent: `S02` shipped deterministic shared recurrence/conflict helpers, `S03` and `S04` proved the web predictive flows, `S05` proved mobile parity, and `S06` added scoped web accessibility proof plus build/browser reruns.
- ✅ **R011 (predictive scheduling assistance) is validated.**
  - `.gsd/REQUIREMENTS.md` still renders `R011` as `validated` with S06 evidence for predictive web/mobile/browser/build proof.
- ❌ **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.**
  - Fresh web regression is still not green. Two existing E2E specs fail after a clean local reset:
    1. `tests/e2e/auth-groups-access.spec.ts:45` — no-membership sign-in no longer shows `onboarding-empty`; the page renders `groups-shell` in `trusted-online` state instead.
    2. `tests/e2e/find-time.spec.ts:21` — the real find-time route now reports `11 truthful windows` while the seeded expectation still asserts `10 truthful windows`.
- ✅ **UX is refined for calmness, polish, and fit/finish.**
  - Web and mobile predictive surfaces remain warning-only, explicit, and well-instrumented per the slice summaries and the still-passing predictive web/mobile browser specs.
- ❌ **All trust, privacy, and authorization constraints from prior milestones are maintained.**
  - The fresh failing `auth-groups-access` regression means milestone-closeout evidence does not currently re-prove the broader onboarding/authz surface.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes.**
  - Stable proof surfaces remain present, including recurrence suggestion hooks, clash advisory hooks, and typed `calendar-route-state` diagnostics.

## Definition of Done Results

### Verified
- All roadmap slices are checked complete in `.gsd/milestones/M005/M005-ROADMAP.md` and confirmed complete by `gsd_milestone_status`.
- Slice `SUMMARY` and `UAT` artifacts exist for all six slices.
- Fresh targeted web verification re-proved the predictive editor/browser work inside `tests/e2e/calendar-shifts.spec.ts`, including the previously failing touching-boundary advisory-free scenario.
- Requirement `R011` still has matching validation evidence in `.gsd/REQUIREMENTS.md`.

### Blocking gaps
- Fresh regression is not clean: `auth-groups-access.spec.ts` and `find-time.spec.ts` still fail after a clean local reset.
- Because those broader web regressions remain red, milestone-wide integration and hardening are not yet re-proven.
- `.gsd/milestones/M005/M005-VALIDATION.md` still remains `verdict: needs-attention`.
- `.gsd/milestones/M005/M005-ROADMAP.md` still lists `## Boundary Map` as `Not provided.` (documentation gap carried forward from validation).

## Decision Re-evaluation

| Decision | Shipped outcome | Revisit? | Notes |
|---|---|---:|---|
| D063 | Honored | No | M005 stayed scoped to recurrence suggestions plus clash advisories instead of expanding into deferred predictive ideas. |
| D064 | Honored | No | Web recurrence suggestions still use bounded same-calendar history and optional truth-preserving prefill. |
| D065 | Honored | No | Web clash detection remains advisory-only and keeps submit enabled. |
| D066 | Honored | No | Mobile predictive parity still reuses the shared bounded/helper contracts rather than introducing divergent mobile-only logic. |
| D067 | Partially honored | Yes | Typed route-state diagnostics and scoped axe proof shipped, but milestone-closeout hardening remains blocked until the fresh auth/onboarding and find-time regressions are resolved and validation is refreshed. |

## Requirement Outcomes

- **R011:** current `validated` status remains supported by the existing S06 evidence in `.gsd/REQUIREMENTS.md`.
- **No requirement updates were performed in this turn** because verification did not pass and the failure path forbids milestone-closeout state mutation.

## Fresh Failure Details

1. **Auth/onboarding regression**
   - Spec: `tests/e2e/auth-groups-access.spec.ts:45`
   - Failure: expected `getByTestId('groups-shell')` to contain `onboarding-empty` after signing in as the seeded no-membership user.
   - Actual: `groups-shell` rendered `Shell state trusted-online ...` instead.
2. **Find-time inventory regression**
   - Spec: `tests/e2e/find-time.spec.ts:21`
   - Failure: expected `getByTestId('find-time-summary')` to contain `10 truthful windows`.
   - Actual: summary rendered `11 truthful windows`.
3. **Previously failing boundary advisory case is now green**
   - `tests/e2e/calendar-shifts.spec.ts:339` passed on the fresh rerun, so that earlier blocker is no longer preventing closeout.

## What Must Be Fixed Before Completion

1. Resolve the remaining fresh web regressions:
   - `tests/e2e/auth-groups-access.spec.ts`
   - `tests/e2e/find-time.spec.ts`
2. Re-run the clean-reset web regression after those fixes and capture fresh passing evidence.
3. Refresh `.gsd/milestones/M005/M005-VALIDATION.md` so it reflects current artifacts and a passing closeout verdict.
4. Either add the missing roadmap boundary map or explicitly narrow the validation expectation so milestone documentation is internally consistent.

## Closeout Guardrails Applied

- `gsd_complete_milestone` was **not** called.
- `.gsd/PROJECT.md` was **not** refreshed to reflect completion.
- `.gsd/REQUIREMENTS.md` was **not** mutated in this turn.
- Learnings were **not** extracted or persisted because the milestone did not pass verification and closeout stopped on the failure path.

Milestone M005 verification FAILED — not complete.
