---
estimated_steps: 43
estimated_files: 4
skills_used: []
---

# T01: Type the web route-state proof surface and unstick stale E2E assertions

---
estimated_steps: 5
estimated_files: 4
skills_used:
  - accessibility
  - test
  - verify-before-complete
---

# T01: Type the web route-state proof surface and unstick stale E2E assertions

**Slice:** S06 — Hardening, accessibility, and deployment readiness
**Milestone:** M005

## Description

Harden the known brittle web continuity proof seam before adding new verification. The web calendar route currently renders human-facing prose inside `calendar-route-state`, but the corresponding Playwright assertions and helper logic still infer route mode from text content. Align the web surface with the already-stable mobile pattern by exposing explicit route diagnostics on the `calendar-route-state` element and converting the affected web E2E specs/helpers to assert attributes instead of prose.

## Negative Tests

- **Malformed inputs**: Prove the route-state contract still distinguishes `trusted-online`, `cached-offline`, and `offline-denied` without relying on translated or edited copy.
- **Error paths**: Keep explicit denied-state assertions for unsynced calendar navigation so fail-closed metadata remains inspectable.
- **Boundary conditions**: Ensure shared helpers only wait for trusted-online local snapshot readiness when the structured attribute actually reports `trusted-online`.

## Steps

1. Add stable route diagnostics to `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, starting with `data-route-mode` and companion reason/detail attributes if they improve assertion clarity.
2. Replace text-based route-mode assertions in `apps/web/tests/e2e/calendar-offline.spec.ts` with `toHaveAttribute(...)` checks against the new contract, while preserving the existing board/local-state proof.
3. Patch sibling web E2E seams that still scrape `calendar-route-state` prose, especially `apps/web/tests/e2e/calendar-sync.spec.ts` and the trusted-online readiness gate in `apps/web/tests/e2e/fixtures.ts`.
4. Keep denial assertions scoped to structured mode/reason contracts plus the existing visible denial UI; do not broaden offline behavior.
5. Re-run the targeted web continuity/realtime specs from a fresh Supabase reset.

## Must-Haves

- [ ] `calendar-route-state` publishes a typed route-mode contract that future specs can consume without reading human copy.
- [ ] Web offline/realtime specs and helpers stop keying route mode off `textContent()`.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- Assert the updated specs prove `trusted-online`, `cached-offline`, and `offline-denied` via attributes while preserving existing queue/board/denial checks.

## Observability Impact

- Signals added/changed: typed web route-state attributes for route mode and related denial/reason details.
- How a future agent inspects this: inspect `data-testid="calendar-route-state"` in Playwright or the rendered DOM instead of scraping prose.
- Failure state exposed: route-mode drift now fails as an explicit attribute mismatch rather than an ambiguous copy mismatch.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current web calendar route-state UI.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — stale web continuity assertions.
- `apps/web/tests/e2e/calendar-sync.spec.ts` — sibling web route-state assertions that still read prose.
- `apps/web/tests/e2e/fixtures.ts` — shared readiness helper that currently checks `textContent()`.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — typed route-state attributes added for stable proof.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — structured route-mode assertions.
- `apps/web/tests/e2e/calendar-sync.spec.ts` — structured route-mode assertions.
- `apps/web/tests/e2e/fixtures.ts` — helper logic updated to consume typed diagnostics.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts

## Observability Impact

Promotes the web calendar route-state element to the same style of typed diagnostic contract already used on mobile, making future continuity failures cheaper to localize.
