---
estimated_steps: 4
estimated_files: 3
skills_used:
  - frontend-design
  - debug-like-expert
---

# T03: Render Top picks explanations and prove the ranked flow in the browser

**Slice:** S02 — Ranked suggestions and explanation quality
**Milestone:** M002

## Description

Spend the UI complexity budget only after the contract is trustworthy. Add a distinct Top picks surface ahead of the browse list, keep richer explanation density in the shortlist than in the lighter browse grid, and update browser proof so the real route demonstrates ranking quality without regressing denied or offline behavior.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Ranked search payload from `+page.server.ts` | Show the existing explicit route/search error states instead of guessing missing explanation copy. | Preserve timeout UI from S01; do not downgrade into a silent empty shortlist. | Render guarded fallback copy for missing optional fields and fail the browser proof if required shortlist data is absent. |
| Seeded browser fixtures in `fixtures.ts` | Keep the browser test red until seeded ordering and explanation snapshots match the trusted contract. | Treat the task as incomplete; do not weaken assertions to fit flaky data. | Fail the browser proof rather than normalizing malformed card attributes in the test helper. |

## Load Profile

- **Shared resources**: browser rendering of shortlist and browse cards plus Playwright fixture snapshots.
- **Per-operation cost**: one protected route load and one ranked search render per test path.
- **10x breakpoint**: DOM density and duplicated explanation copy will hurt scanability first if shortlist and browse cards are not deliberately differentiated.

## Negative Tests

- **Malformed inputs**: missing explanation snippets, empty blocked-member lists, and unexpected empty `topPicks` arrays.
- **Error paths**: denied calendar access, offline entry, ready payloads with empty shortlist, and route error statuses.
- **Boundary conditions**: top picks capped to a small shortlist, browse list still rendering remaining ranked results, and adjacent constraints on both sides of a focused candidate.

## Steps

1. Redesign `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` so Top picks render before the browse list with stronger explanation density, named free/blocked members, and nearby before/after constraint summaries while preserving existing denied/error/offline surfaces.
2. Add stable `data-testid` and data-attribute hooks for shortlist cards, browse cards, and explanation details so browser proof can inspect ranked order and explanation content directly.
3. Update `apps/web/tests/e2e/fixtures.ts` and `apps/web/tests/e2e/find-time.spec.ts` to prove shortlist order, explanation details, lighter browse list, explicit denial, and fail-closed offline entry.
4. Keep the route scan-friendly by making Top picks the high-density surface and browse results the lighter follow-on inventory.

## Must-Haves

- [ ] The UI exposes a visibly distinct Top picks section before the browse list.
- [ ] Each top pick shows who is free, who is blocked, and nearby constraints that explain adjacent exclusions.
- [ ] Browse results remain truthful and lighter-weight instead of duplicating the full shortlist explanation block everywhere.
- [ ] Browser proof still confirms unauthorized and offline entry stay explicit and fail closed.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`
- `pnpm --dir apps/web check`

## Observability Impact

- Signals added/changed: top-pick and browse-card `data-testid` hooks plus explanation data attributes become browser-visible inspection surfaces.
- How a future agent inspects this: run the Playwright spec and inspect card snapshots/data attributes in the browser.
- Failure state exposed: missing shortlist data, incorrect ranking order, and denied/offline regressions become visible in browser proof.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — current browse-only route UI from S01.
- `apps/web/tests/e2e/fixtures.ts` — seeded route snapshots and find-time fixture expectations.
- `apps/web/tests/e2e/find-time.spec.ts` — browser proof for permitted, denied, and offline flows.
- `apps/web/src/lib/server/find-time.ts` — shortlist and explanation payload contract from T02.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — Top picks and browse surfaces with stable inspection hooks.
- `apps/web/tests/e2e/fixtures.ts` — ranked shortlist and explanation snapshots.
- `apps/web/tests/e2e/find-time.spec.ts` — browser proof for ranked order, explanation content, denial, and offline fail-closed behavior.
