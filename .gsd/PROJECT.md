# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation across web and mobile.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 and M002 are complete and validated on the web proof surface.

What works today:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes
- shared calendars with multi-shift create/edit/move/delete and bounded recurrence
- previously synced calendars reopening offline with local-first edits that survive reload
- deterministic reconnect drain and live collaborator refresh
- visible board/day/shift conflict warnings across online, offline, reconnect, and realtime states
- truthful shared free-time matching with ranked Top picks, explanation-rich windows, and exact suggestion-to-create handoff into the existing calendar flow

What exists but is not yet a real product surface:
- `apps/mobile` is still a Capacitor starter shell rather than a first-class Caluno client

What is planned next:
- M003 makes mobile real without making it feel fake: native-feeling navigation, the main/core scheduling loop on phone, mobile offline continuity for the calendar core, and trustworthy per-device/per-calendar notifications
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
- M003 reuses shared product logic and backend contracts where possible, but mobile gets mobile-specific UI flows instead of a thin port of web screens
- M003 notification direction: local reminders for a user’s own upcoming shifts, push notifications for shared-calendar changes, and per-device/per-calendar control with one calm toggle

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Shared scheduling substrate — Trusted shared calendars, offline continuity, sync, realtime refresh, and baseline conflict visibility on web.
- [x] M002: Shared free-time matching — Truthful ranked availability search, explanations, and suggestion-to-create handoff on the shared substrate.
- [ ] M003: Cross-platform continuity and reminders — Real mobile client parity for the core loop plus trustworthy device-scoped reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Predictive coordination help and product hardening after cross-platform continuity is real.
