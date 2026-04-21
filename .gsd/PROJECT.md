# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation across web and mobile.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 and M002 are complete and validated on the web proof surface.

M003 is in progress. S01 is now complete and turns `apps/mobile` from a Capacitor starter into a real authenticated mobile shell with trusted scope loading and truthful denied states.

What works today:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes on web
- shared calendars with multi-shift create/edit/move/delete and bounded recurrence on web
- previously synced calendars reopening offline with local-first edits that survive reload on web
- deterministic reconnect drain and live collaborator refresh on web
- visible board/day/shift conflict warnings across online, offline, reconnect, and realtime states on web
- truthful shared free-time matching with ranked Top picks, explanation-rich windows, and exact suggestion-to-create handoff into the existing calendar flow on web
- mobile-first auth bootstrap with explicit signed-out, invalid-session, config-error, and loading surfaces
- shared `@repo/caluno-core` trusted-scope helpers consumed by both web and mobile
- mobile groups and calendar shell routes that load only permitted memberships/calendars through trusted inventory shaping
- mobile denied states that distinguish malformed calendar ids from real-but-out-of-scope ids without probing arbitrary calendar existence
- mobile Playwright proof for sign-in, permitted scope, denied scope, reload continuity, sign-out closure, and malformed persisted-session rejection
- first successful Capacitor iOS bootstrap/sync for the mobile shell

What is not yet complete:
- mobile schedule continuity, offline edit/drain behavior, and the main calendar editing loop are still pending in M003/S02
- mobile Find time and create handoff are still pending in M003/S03
- per-device/per-calendar notification controls and delivery wiring are still pending in M003/S04
- final cross-surface notification correctness and assembled mobile proof are still pending in M003/S05

What is planned next:
- M003/S02 extends the new mobile shell into real calendar continuity and editing, including pending offline changes and trusted reconnect drain
- M003/S03 brings Find time into mobile with compact suggestion browsing and handoff into mobile shift creation
- M003/S04 adds device-scoped notification controls and delivery wiring for reminders and shared-calendar changes
- M003/S05 closes the milestone with cross-surface notification correctness and assembled mobile proof that the app does not feel fake
- M004 builds the later predictive assistance layer and release hardening after the cross-platform core is stable

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile app in `apps/mobile` using SvelteKit + Capacitor
- Supabase is the backend authority for auth, database, RLS, and realtime
- Thin SvelteKit server composition sits on top of Supabase for trusted schedule and find-time operations
- Scheduling is local-first, with the server canonical after reconnect
- Web offline continuity already exists behind repository/controller seams, with browser-local snapshots, queued mutations, reconnect replay, and realtime refresh orchestration
- Find time is a trusted server-backed capability with explicit fail-closed offline behavior rather than cached guessed answers
- Shared pure mobile/web auth/scope/app-shell helpers now live in `@repo/caluno-core`, while Svelte/runtime integration stays in app-local wrappers
- M003 reuses shared product logic and backend contracts where possible, but mobile gets mobile-specific UI flows instead of a thin port of web screens
- The mobile shell now treats cached Supabase session data as untrusted until `getSession()` plus `getUser()` revalidate it client-side
- Mobile protected routes resolve access only from one shaped trusted inventory snapshot and surface denied reason/failure phase/attempted id explicitly in the UI
- M003 notification direction remains: local reminders for a user’s own upcoming shifts, push notifications for shared-calendar changes, and per-device/per-calendar control with one calm toggle

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Shared scheduling substrate — Trusted shared calendars, offline continuity, sync, realtime refresh, and baseline conflict visibility on web.
- [x] M002: Shared free-time matching — Truthful ranked availability search, explanations, and suggestion-to-create handoff on the shared substrate.
- [ ] M003: Cross-platform continuity and reminders — Mobile shell/auth/trusted scope are now real; offline continuity, editing, and notification slices remain.
- [ ] M004: Predictive assistance and release hardening — Predictive coordination help and product hardening after cross-platform continuity is real.
