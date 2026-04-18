# S02 Research — Ranked suggestions and explanation quality

## Requirement focus

- **Owns `R008`**: this slice is where the route stops being a truthful browse surface and becomes a useful recommendation surface.
- **Supports `R002` and `R012`**: ranking/explanation work must stay inside the existing protected calendar boundary and must not widen scope or invent unavailable certainty.

## Strategic readout

S02 is **targeted research**, not a new substrate slice. S01 already retired the risky architecture work: member-attributed busy intervals exist, roster names are safe to read, the protected route is live, and the server already returns truthful candidate windows.

The real gap now is a **presentation-grade decision layer** on top of that trusted contract:

1. rank candidates so the top few feel useful,
2. shape truthful explanation fragments for why a candidate works and what nearby constraints excluded adjacent time,
3. render those explanations without destroying scanability.

The biggest implementation constraint is that the current matcher is still a **chronological window generator**, not a recommender. Ranking cannot be bolted onto the Svelte page alone.

## Skill-informed guidance

The installed **`frontend-design`** skill is directly relevant here even though this slice is not pure styling work.

Two rules from that skill should shape implementation:

- **“Choose a clear conceptual direction and execute it with precision.”** For S02, that means the shortlist must become a visibly distinct ranked surface, not the same browse cards repeated with a different heading.
- **“Controlled density” and “one high-impact moment.”** This strongly favors **richer explanation density in the shortlist** and a lighter, faster-scanning browse list underneath. That matches the milestone’s open question well: do not force the full list to carry the same explanation weight as the top picks.

## Skill discovery (suggested, not installed)

Already installed and directly relevant:
- `frontend-design`

Promising external skills for this slice’s core stack, if the user wants them later:
- `npx skills add spences10/svelte-skills-kit@sveltekit-data-flow`
- `npx skills add supabase/agent-skills@supabase`
- `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices`

No skill was installed during research.

## Implementation landscape

### What exists already

#### `apps/web/src/lib/find-time/matcher.ts`

This is the current pure matching core.

What it already does well:
- validates duration and 30-day range,
- sweeps busy-interval boundaries,
- merges continuous spans with the same available-member set,
- returns exact-slot plus continuous-span metadata.

What it does **not** do yet:
- no score,
- no ranking breakdown,
- no shortlist,
- no blocked-member list,
- no nearby-constraint explanation,
- no notion of “top picks feel right.”

Current `FindTimeWindow` only includes:
- exact `startAt` / `endAt`,
- containing `spanStartAt` / `spanEndAt`,
- `availableMembers` / `availableMemberIds`,
- `busyMemberCount`.

That payload is enough for S01 browsing, but not enough for S02 explanation quality.

#### `apps/web/src/lib/server/find-time.ts`

This is the correct place to keep orchestration.

Good news:
- auth/scope logic is already isolated in `loadCalendarMemberAvailability()`,
- roster + busy loading are already typed and fail closed,
- `loadFindTimeSearchView()` already performs the post-load composition step.

That means S02 can stay aligned with the milestone decision to keep matching logic in the **trusted server layer over Supabase**, without touching route authorization patterns.

#### `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`

The route UI already has:
- stable state surfaces,
- explicit denied/offline/error/no-results rendering,
- a single browse grid for results.

This file is ready for a second results surface (`Top picks`) above the current browse list, but it currently only knows how to render the simple S01 card contract.

#### Current proof fixtures already reveal the ranking problem

`apps/web/tests/e2e/fixtures.ts` defines the current seeded first result as:
- `2026-04-15T00:00:00.000Z → 01:00:00.000Z`

So the current “first window” is literally a midnight slot. That is strong evidence that the existing output is **chronological browse order**, not recommendation order.

## Key constraints the planner should respect

### Constraint 1 — ranking after truncation would be wrong

`buildFindTimeWindows()` currently computes `matchingSpans`, then sets `totalWindows`, then slices to `maxWindows` before returning the window array.

That means if S02 sorts only the returned `windows`, it will rank only the **first 200 chronological candidates**, not the full truthful candidate set.

**Planner implication:** ranking must happen **before final truncation**, or truncation must move to the presentation edge after scoring.

### Constraint 2 — explanation quality needs new candidate metadata

Current windows only answer:
- who is free now,
- how wide is the continuous span.

They do **not** answer:
- who is excluded from this exact slot,
- which busy intervals forced the span edge,
- why moving slightly earlier/later stops working for the same group.

S02 needs a derived explanation contract, not just a sorted array.

### Constraint 3 — current busy intervals drop shift titles

`loadCalendarMemberAvailability()` currently selects:
- `id, start_at, end_at, shift_assignments(member_id)`

and `MemberBusyInterval` carries:
- `shiftId`, `memberId`, `memberName`, `startAt`, `endAt`.

If S02 wants explanation copy stronger than “Alice is busy 09:00–11:00”, it will need to preserve `title` from `shifts` into the explanation layer.

This is optional for truthful explanations, but it is the cleanest low-cost improvement if product copy wants more context.

### Constraint 4 — there is no truthful time-of-day preference today

Milestone context explicitly says availability is determined from hard busy intervals and otherwise-open time. There is **no maintained preference model** for work hours, quiet hours, buffers, or rest rules.

So S02 can truthfully prefer:
- more available members,
- earlier dates in the horizon,
- larger continuous spans,
- fewer nearby edge conflicts.

But it **cannot** honestly demote midnight just because midnight “feels wrong” unless the team adopts a new product rule.

**Planner implication:** either
- keep ranking tied to explicit truthful metrics only, or
- record a product decision before introducing time-of-day weighting.

### Constraint 5 — shortlist semantics are still slightly ambiguous

Current browse windows can include subsets of the roster, including single-member windows in unit coverage.

That leaves an open product question for S02:
- should the shortlist include any truthful candidate and simply rank larger groups higher,
- or should top picks require a minimum of 2 free members because this is “shared free-time”?

The codebase does not answer this yet; the planner should make the rule explicit in tasks/tests.

## Recommended seams

### Seam 1 — keep raw availability loading untouched

Do **not** rework:
- `resolveCalendarReadScope()`
- `loadCalendarMemberAvailability()`
- offline/denied route behavior

Those are already the S01 truth boundary and should remain stable.

### Seam 2 — split raw candidate generation from recommendation shaping

The clean boundary is:

1. **raw candidate generation** from roster + busy intervals + duration/range
2. **ranking/explanation shaping** from those raw candidates plus nearby busy intervals

A new pure module is warranted, e.g.:
- `apps/web/src/lib/find-time/ranking.ts`
- or `apps/web/src/lib/find-time/presentation.ts`

That keeps `matcher.ts` focused on truthful availability generation and gives S02 a dedicated place for score/explanation rules.

### Seam 3 — server should expose separate shortlist and browse payloads

The easiest UI/testing contract is not “one array plus UI slicing.”

Prefer the server returning something like:
- `topPicks: FindTimeRankedCandidate[]`
- `browseWindows: FindTimeRankedCandidate[]`
- `totalWindows`
- `truncated`

This avoids duplicating ranking logic in Svelte and makes route/e2e assertions explicit.

### Seam 4 — keep explanation richer in shortlist than browse list

Use the existing UI’s explicit-state discipline, but differentiate result density:
- **Top picks**: score-informed summary + nearby before/after constraints + full free-member list
- **Browse list**: exact slot + continuous span + free-member count/list, with lighter explanation copy

That is the cleanest answer to the milestone’s explanation-density open question.

## Recommended explanation contract

A candidate type along these lines would fit the milestone well:

```ts
type FindTimeNearbyConstraint = {
  memberId: string;
  memberName: string;
  shiftId: string;
  shiftTitle?: string;
  startAt: string;
  endAt: string;
  relation: 'leading-edge' | 'trailing-edge';
};

type FindTimeRankBreakdown = {
  availableMemberCount: number;
  busyMemberCount: number;
  spanDurationMinutes: number;
  nearbyConstraintCount: number;
  startsAt: string;
};

type FindTimeRankedCandidate = FindTimeWindow & {
  score: number;
  scoreBreakdown: FindTimeRankBreakdown;
  blockedMembers: { memberId: string; memberName: string }[];
  nearbyConstraints: FindTimeNearbyConstraint[];
};
```

The important thing is not the exact shape; it is that the payload must let the UI answer:
- why this slot works,
- who is included,
- who is excluded,
- what busy intervals define the nearest invalid edges.

## What to build or prove first

### First proof

Build the **pure ranking/explanation layer** first.

Why first:
- it retires the actual S02 risk,
- it gives a stable contract to the route/UI,
- it prevents the planner from spending time reshuffling Svelte before the score/explanation model is credible.

### Second proof

Wire ranked/explained candidates into `loadFindTimeSearchView()`.

Why second:
- preserves S01 authorization and fail-closed guarantees,
- lets route unit tests assert the server contract before UI changes.

### Third proof

Update `+page.svelte` to render:
- shortlist first,
- lighter full browse list second,
- explicit empty/error/denied/offline behavior unchanged.

## Testing and verification

### Unit proof

Primary files to extend:
- `apps/web/tests/find-time/matcher.unit.test.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`

Likely additions:
- ranking order for a seeded multi-member scenario,
- explanation shaping for nearby leading/trailing constraints,
- behavior when multiple candidates have equal availability counts,
- proof that no-results/invalid-input/denied behavior is unchanged.

If shift titles are added to explanation payloads, also update:
- `apps/web/tests/find-time/member-availability.unit.test.ts`

### Browser proof

Primary files to extend:
- `apps/web/tests/e2e/find-time.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

The current e2e fixture is good evidence that chronological browse order exists, but it is **not yet a strong ranking fixture**. For S02, add or adjust seeded assertions so the browser proof can verify:
- top picks render ahead of the browse list,
- top pick order matches the intended truthful ranking rule,
- a top pick shows free members plus nearby exclusion explanation,
- denied/offline behavior still matches S01.

### Expected verification commands

- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`

## Planner notes

Natural task split:

1. **Pure ranking/explanation contract**
   - add ranked candidate types + scoring + nearby-constraint shaping
   - prove with unit tests

2. **Server contract integration**
   - return `topPicks`/ranked browse results from `loadFindTimeSearchView()`
   - update route tests

3. **Route UI upgrade**
   - add a distinct shortlist surface and lighter browse list explanations
   - update browser fixtures/spec

Most important trap to avoid: **do not implement S02 as a UI-only sort of the existing `search.windows` array**. That would preserve the current pre-ranking truncation bug and still leave the route without truthful explanation metadata.
