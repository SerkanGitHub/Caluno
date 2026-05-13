# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation across web and mobile.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 through M005 are complete and validated. The product now includes predictive scheduling assistance (smart recurrence suggestions and non-blocking clash advisories) on both web and mobile, built on top of the complete cross-platform coordination loop from M001–M004.

What works today:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes on web
- shared calendars with multi-shift create/edit/move/delete and bounded recurrence on web
- previously synced calendars reopening offline with local-first edits that survive reload on web
- deterministic reconnect drain and live collaborator refresh on web
- visible board/day/shift conflict warnings across online, offline, reconnect, and realtime states on web
- truthful shared free-time matching with ranked Top picks, explanation-rich windows, and exact suggestion-to-create handoff into the existing calendar flow on web
- mobile-first auth bootstrap with explicit signed-out, invalid-session, config-error, and loading surfaces
- shared `@repo/caluno-core` trusted-scope, find-time, ranking, and create-prefill contracts consumed by both web and mobile
- mobile groups and calendar shell routes that load only permitted memberships/calendars through trusted inventory shaping
- mobile denied states that distinguish malformed calendar ids from real-but-out-of-scope ids without probing arbitrary calendar existence
- mobile previously synced calendar reopen with local-first offline edits, reload persistence, retryable queue visibility, and trusted reconnect drain
- compact mobile Find time with explicit ready/denied/offline/error states, Top picks ahead of browse windows, and fail-closed offline behavior
- exact mobile Find time slot handoff into the existing `ShiftEditorSheet`, with one-shot query cleanup and visible `From Find time` attribution
- per-device, per-calendar mobile notification preferences backed by a stable installation id rather than the push token
- one truthful notification toggle per permitted calendar on `/groups`, mirrored on `/calendars/[calendarId]`, with explicit permission/local-reminder/remote-subscription/degraded state
- deterministic local reminder scheduling from trusted synced weeks already stored on-device
- fail-closed notification tap routing that rejects unsafe or out-of-scope targets instead of navigating optimistically
- provider-neutral shared-calendar change dispatch wiring with honest `provider-unconfigured` degradation
- best-effort shared-change dispatch wired into all four trusted web schedule mutations (create/edit/move/delete) via `calendar-change-notifier.ts`
- best-effort shared-change dispatch wired into all four mobile schedule mutations including reconnect-drained replays via `calendar-change-dispatch.ts`
- Playwright notification harness upgraded to delivery-state inspection: per-calendar pending/delivered inventory, edge-function stubbing, enabled/disabled delivery proof, and duplicate suppression
- final assembled mobile tracer bullet (sign-in → offline continuity → find-time handoff → notification delivery → negative paths) in the default test:e2e bar
- trusted-offline route-mode tracking when connectivity drops within a trusted calendar session
- mobile Playwright proof for sign-in, permitted scope, denied scope, offline continuity, reconnect drain, Find time handoff, notification toggle persistence, degraded notification states, safe notification routing, and cross-surface notification delivery
- successful Capacitor iOS packaging/sync for the assembled mobile scheduling + notification surface
- **smart recurrence suggestions** on web and mobile: `detectRecurrencePattern` in `@repo/caluno-core` detects same-weekday same-hour patterns from ≥3 shifts in 30 days and surfaces a dismissable suggestion chip in the shift create dialog/sheet
- **non-blocking clash advisories** on web and mobile: `previewShiftConflicts` in `@repo/caluno-core` previews overlapping same-calendar shifts before save; the advisory is warning-only and does not block the save action
- web recurrence suggestion chip wired into `ShiftEditorDialog` with accept/dismiss/reload behavior and stable `data-testid` hooks; bounded loader scoped to authorized calendar id and 30-day trailing window
- web clash advisory rendered in `ShiftEditorDialog` using typed `data-testid="clash-advisory"` live region before the save confirm
- mobile recurrence suggestion chip and clash advisory wired into `ShiftEditorSheet` using the same shared helper contracts and `data-testid` vocabulary as web
- scoped WCAG 2.1 AA accessibility proof on the predictive create-editor subtree (zero new violations via `@axe-core/playwright`)
- typed `calendar-route-state[data-route-mode][data-route-reason]` diagnostics on web for stable Playwright route-state proofs
- R011 (predictive scheduling assistance) validated against shipped recurrence suggestion and clash advisory surfaces

Known limitations remaining after M005:
- Full web E2E regression suite has pre-existing test-expectation drift in `auth-groups-access.spec.ts` (shell diagnostic layout) and `find-time.spec.ts` (seeded window count mismatch) — these are not caused by M005 and need baseline stabilization
- No slice-level `*-ASSESSMENT.md` artifacts were produced across M005 slices — a process gap to address in future milestones
- Real provider-backed remote delivery (APNs/FCM) on a provisioned device — deferred to live integration testing

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile app in `apps/mobile` using SvelteKit + Capacitor
- Supabase is the backend authority for auth, database, RLS, and realtime
- Thin SvelteKit server composition sits on top of Supabase for trusted schedule and find-time operations
- Scheduling is local-first, with the server canonical after reconnect
- Web offline continuity exists behind repository/controller seams, with browser-local snapshots, queued mutations, reconnect replay, and realtime refresh orchestration
- Find time remains a trusted authority-backed capability with explicit fail-closed offline behavior rather than cached guessed answers
- Shared pure mobile/web auth, scope, matcher, ranking, timing-only create-prefill, and now predictive (recurrence + advisory) helpers live in `@repo/caluno-core`; Svelte/runtime integration stays app-local
- Predictive helpers are deterministic: evidence windows anchor to the latest valid shift in provided data, not `Date.now()`; malformed/inverted/duplicate rows are filtered fail-closed before thresholds apply
- Advisory conflict previews are warning-only: `previewShiftConflicts` returns overlapping shifts but imposes no blocking write policy — users stay in control
- Predictive UI surfaces use calm, dismissable hint patterns with stable `data-testid` hooks (`recurrence-suggestion`, `clash-advisory`) and ARIA live regions for accessibility
- Mobile predictive behavior is split cleanly: route owns recurrence-suggestion diagnostics; `ShiftEditorSheet` plus `shift-editor-predictive.ts` own accept/dismiss lifecycle and clash-advisory rendering
- Typed route diagnostics (`data-route-mode`, `data-route-reason`) decouple Playwright proof assertions from prose copy
- Accessibility hardening is done scoped to feature subtrees, not whole-app scans

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Shared scheduling substrate — Trusted shared calendars, offline continuity, sync, realtime refresh, and baseline conflict visibility on web.
- [x] M002: Shared free-time matching — Truthful ranked availability search, explanations, and suggestion-to-create handoff on the shared substrate.
- [x] M003: Cross-platform continuity and reminders — Mobile auth, offline continuity, Find time, notification controls, and cross-surface notification delivery correctness.
- [x] M004: Find-time and mobile handoff hardening — Find-time suggestion CTAs, ranked Top picks explanations, and mobile/web handoff determinism.
- [x] M005: Predictive assistance and release hardening — Smart recurrence suggestions and non-blocking clash advisories on web and mobile, accessibility proof, typed route diagnostics, and R011 validated.
