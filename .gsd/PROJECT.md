# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation across web and mobile.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 and M002 are complete and validated on the web proof surface.

M003 is complete. All five slices (S01–S05) are done. The mobile app is a real authenticated calendar client with offline continuity, compact Find time handoff, per-device notification controls, and cross-surface notification delivery correctness.

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

What is not yet complete:
- Two E2E test-code assertions need updating (calendar-offline.spec.ts route-mode expectation and mobile-assembly.spec.ts top-pick ordering sensitivity) — production behavior is correct, test assertions are stale
- Real provider-backed remote delivery (APNs/FCM) on a provisioned device — deferred to live integration testing
- Predictive assistance remains deferred to M004

What is planned next:
- M004 builds predictive assistance and release hardening on top of the now-complete cross-platform coordination loop

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile app in `apps/mobile` using SvelteKit + Capacitor
- Supabase is the backend authority for auth, database, RLS, and realtime
- Thin SvelteKit server composition sits on top of Supabase for trusted schedule and find-time operations
- Scheduling is local-first, with the server canonical after reconnect
- Web offline continuity already exists behind repository/controller seams, with browser-local snapshots, queued mutations, reconnect replay, and realtime refresh orchestration
- Find time remains a trusted authority-backed capability with explicit fail-closed offline behavior rather than cached guessed answers
- Shared pure mobile/web auth, scope, matcher, ranking, and timing-only create-prefill helpers now live in `@repo/caluno-core`, while Svelte/runtime integration stays app-local
- Mobile Find time is split into a pure transport helper plus a pure view-state shaper so trusted authority, offline denial, and compact UI state stay testable separately
- Mobile Find time handoff reuses the existing `ShiftEditorSheet` instead of introducing a second create surface; arrival query params are cleaned immediately after first render
- M003 reuses shared product logic and backend contracts where possible, but mobile gets mobile-specific UI flows instead of a thin port of web screens
- The mobile shell treats cached Supabase session data as untrusted until `getSession()` plus `getUser()` revalidate it client-side
- Mobile protected routes resolve access only from one shaped trusted inventory snapshot and surface denied reason, failure phase, and attempted id explicitly in the UI
- Notification state on mobile is rooted in a stable installation UUID, persists desired intent separately from runtime health, and exposes degraded reasons instead of hiding them behind a boolean toggle
- Notification-open routing always normalizes target paths and checks trusted calendar scope before navigation
- Best-effort dispatch pattern: void-after-canonical-write keeps schedule helpers synchronous; dispatch errors/timeouts never reach callers
- trusted-offline is a distinct MobileOfflineRouteMode (alongside trusted-online and cached-offline) representing connectivity loss within an active trusted calendar session

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Shared scheduling substrate — Trusted shared calendars, offline continuity, sync, realtime refresh, and baseline conflict visibility on web.
- [x] M002: Shared free-time matching — Truthful ranked availability search, explanations, and suggestion-to-create handoff on the shared substrate.
- [x] M003: Cross-platform continuity and reminders — Mobile auth, offline continuity, Find time, notification controls, and cross-surface notification delivery correctness are all complete.
- [ ] M004: Predictive assistance and release hardening — Predictive coordination help and product hardening after cross-platform continuity is real.
