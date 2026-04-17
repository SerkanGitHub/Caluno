# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 is in late validation state. S01 through S06 are now implemented and slice S06 has produced durable closeout artifacts, stronger browser-proof helpers, repaired browser-session hydration for realtime subscriptions, and backfilled S01-S04 assessment artifacts.

The strongest current evidence is:
- isolated preview-backed offline proof passes (`calendar-offline.spec.ts`)
- isolated preview-backed sync/realtime proof passes (`calendar-sync.spec.ts`)
- typecheck plus focused unit regressions pass (`conflicts`, `board`, `offline-queue`, `sync-engine`, `server-actions`)
- milestone validation has been refreshed to `needs-attention` instead of the earlier missing-assessment/remediation state

The remaining blocker is verification composition, not missing core product code: the required combined clean-reset browser command for `calendar-offline.spec.ts` plus `calendar-sync.spec.ts` still has shared-state drift because one preview-backed spec mutates the seeded week that the later spec still partially assumes as baseline. M001 should therefore be treated as feature-complete but not yet fully milestone-complete.

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile shell in `apps/mobile` using SvelteKit + Capacitor
- Shared packages in `packages/`
- M001 is a web-first proof surface
- Backend direction: Supabase for auth, Postgres, RLS, and realtime, with a thin SvelteKit server layer for privileged/composed operations only
- Client direction: local-first data flow with server-canonical reconciliation after reconnect
- Offline storage direction for M001 web: browser SQLite/WASM behind repository boundaries
- Auth/access pattern: request-scoped Supabase SSR client, `safeGetSession()` revalidation with `getUser()`, and minimal trusted auth state passed through SvelteKit locals/layout data
- Protected-route pattern: `(app)` layout loads the trusted visible shell once; calendar routes resolve only from permitted inventory so guessed ids fail closed
- Schedule model: concrete `public.shifts` rows are authoritative editable occurrences, with optional bounded provenance in `public.shift_series`
- Offline continuity pattern: only previously synced permitted calendars reopen offline from cached trusted scope and browser-local snapshots
- Sync/reconnect pattern: trusted refreshes are rebased through the sync engine before replacing visible board state, and reconnect drains reuse existing named route actions
- Realtime pattern: Supabase Realtime is change detection only; shared events trigger trusted refresh plus replay rather than direct client-authoritative mutation
- Current S06 pattern: hydrate the browser Supabase client from trusted layout session data before opening shared realtime channels, and keep Playwright proof tied to visible board/queue/realtime diagnostics instead of transient labels
- Conflict-visibility pattern: derive overlap warnings from the visible effective week only, and keep them separate from local/sync/realtime transport diagnostics

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and validation mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
  - [x] S04: Sync engine and realtime shared updates
  - [x] S05: Baseline conflict detection and milestone assembly proof
  - [x] S06: Offline/realtime validation hardening and assessment closure
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.

## What Downstream Work Can Assume Now

- Authenticated browser requests resolve trusted user state through the SvelteKit/Supabase SSR boundary.
- Local Supabase fixtures exist for profiles, groups, memberships, calendars, join codes, bounded recurring series, and concrete shift rows.
- Protected shared-calendar routes support trusted sign-in, join/create-group flows, and fail-closed access denial.
- Shared calendar members can create, edit, move, and delete multiple same-day and recurring shifts through trusted route actions.
- Previously trusted app-shell scope can be cached locally and used to reopen protected shell/calendar routes offline without minting new authority.
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams and survive reload while offline.
- Reconnect drain sends queued create/edit/move/delete work through the existing trusted calendar route actions and surfaces queue counts, sync phase, last attempt, and last error.
- Shared shift realtime subscriptions now rely on browser-session hydration plus trusted refresh/replay, and isolated collaborator proof is green.
- Conflict warnings remain visible at board/day/shift level across online, offline, reconnect, and isolated collaborator refresh proof.
- Milestone validation still needs one final verification-composition fix: the combined offline+sync browser command on a single clean reset must pass without seeded-baseline drift between spec files.
