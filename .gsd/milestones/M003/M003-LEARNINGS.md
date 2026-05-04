---
phase: M003
phase_name: Cross-platform continuity and reminders
project: Caluno
generated: "2026-04-23T00:00:00Z"
counts:
  decisions: 10
  lessons: 8
  patterns: 8
  surprises: 3
missing_artifacts: none
---

### Decisions

- **@repo/caluno-core as the shared product-contract boundary.** Kept all shared rules — trust contracts, offline helpers, schedule logic, find-time matching/ranking, notification contracts — in a pure workspace package. App-local wrappers own only Svelte/runtime integration. Chose this over duplicating logic in each app or importing across app boundaries.
  Source: S01-SUMMARY.md/Key Decisions (D050, D055)

- **Singleton client-side mobile session store for auth bootstrap.** Used a single session store as the authority for one-time cached-session validation with explicit auth entry states (signed-out, invalid-session, config-error, loading) rather than ad hoc per-route probes. Prevents race conditions and supports test observability.
  Source: S01-SUMMARY.md/Key Decisions (D051)

- **Cache one app-shell snapshot per user; adjacent routes reuse it.** Rather than re-fetching permitted inventory on each route, one shaped trusted inventory snapshot is cached and shared across protected routes. Reduces backend load and prevents partial-inventory inconsistencies.
  Source: S01-SUMMARY.md/Key Decisions (D052)

- **Sign-out inside the protected shell; surface invalid-session via explicit sign-in metadata.** Sign-out is collocated with the protected shell rather than in a global header. Invalid-session flows through explicit sign-in metadata rather than a runtime exception, making failure observable via data-* attributes.
  Source: S01-SUMMARY.md/Key Decisions (D053)

- **Dual validation before mobile cached-offline reopen: shell snapshot + per-calendar synced-week metadata.** Accepting a cached shell snapshot alone is insufficient. Requiring both trusted-shell and per-calendar synced-week metadata before offline reopen prevents stale scope from leaking into the UI.
  Source: S02-SUMMARY.md/Key Decisions (D056)

- **Client-side mobile offline runtime + direct trusted Supabase transport for schedule mutations.** Used mobile-local controller/runtime/transport instead of server-form actions, enabling deterministic offline queue management and reconnect drain without a server round-trip for each mutation.
  Source: S02-SUMMARY.md/Key Decisions (D057)

- **Mobile Find time stays live-backed and fail-closed offline; never replays stale matching answers.** Cached-offline continuity must never surface guessed availability. Mobile Find time is intentionally transport-only — if trusted connectivity is absent, the route shows an explicit offline/denied state.
  Source: S03-SUMMARY.md/Key Decisions

- **Stable installation UUID as the durable mobile notification identity; persist desiredEnabled before permission reconciliation.** Treating the push token as the primary key creates fragility when tokens rotate. Using an app-generated UUID decouples preference persistence from ephemeral provider state. Persisting intent before native permission/registration ensures the toggle remains truthful under degraded conditions.
  Source: S04-SUMMARY.md/Key Decisions

- **void-dispatch pattern for shared-change dispatch at call sites.** Firing dispatch as a void call after the canonical write (not inside the mutation helper) keeps sync helpers synchronous and clean. Dispatch errors never affect write results, and no async coupling is introduced into schedule helpers.
  Source: S05-SUMMARY.md/Key Decisions

- **MobileSupabaseFunctionsSeam as a narrow interface for edge-function invocation.** Exported separately from the transport layer to enable isolated unit testing without importing a real SupabaseClient. Narrow interface pattern reduces coupling and keeps test setup lightweight.
  Source: S05-SUMMARY.md/Key Decisions

---

### Lessons

- **Mobile auth bootstrap needs fail-closed explicit states, not ad hoc probes.** Allowing components to probe auth or calendar scope ad hoc leads to partial-loaded states and hard-to-reproduce race conditions. Modeling the full state machine (signed-out, invalid-session, config-error, loading, ready) as explicit values eliminates this class of bug and makes test assertions deterministic.
  Source: S01-SUMMARY.md/Patterns Established

- **Capacitor Preferences payloads must be validated through the shared continuity contract.** Raw Capacitor Preferences reads return untyped JSON. Validating payloads through the shared continuity schema at read time prevents type drift between what was written and what the runtime assumes — a common source of silent offline reopening failures.
  Source: S02-SUMMARY.md/Patterns Established

- **Local Supabase storage health can generate transient 502s that invalidate test runs.** During S02 verification, a local Supabase storage health-check 502 required a stack restart before re-running the unchanged verification command. The final verification passed. Always restart the local stack before treating a storage-layer failure as a code bug.
  Source: S02-SUMMARY.md/Deviations

- **Brittle E2E inventory assertions break when earlier tests mutate seeded data.** Mobile Playwright specs that assert exact calendar/shift inventories fail non-deterministically when earlier specs create or modify the same seeded data. Prefer contract-focused assertions (metadata presence, fail-closed states, handoff behavior) and per-spec DB resets over exact count/id assertions.
  Source: S03-SUMMARY.md/Patterns Established, S05-SUMMARY.md/Known Limitations

- **The trusted-offline route mode must be distinct from cached-offline.** Connectivity loss within an already-trusted calendar session is semantically different from an initial cached-offline reopen. Conflating them produced a false-positive 'trusted-online' signal in E2E tests. Introducing trusted-offline as its own MobileOfflineRouteMode fixed the signal and enabled honest UI differentiation.
  Source: S05-SUMMARY.md/Deviations, S05-SUMMARY.md/Key Decisions

- **OS-level notification delivery cannot be polled in test environments.** Attempting to inspect device notification state in Playwright is not feasible. The reliable pattern is to intercept edge-function calls and capture per-calendar delivery inventory in a Playwright fixture, then assert on that captured state.
  Source: S04-SUMMARY.md/Patterns Established, S05-SUMMARY.md/Patterns Established

- **E2E test repro plans should include a per-spec DB reset for order-sensitive flows.** The mobile-assembly spec phase 3 top-pick assertion is sensitive to whether find-time-handoff.spec.ts runs first. Adding a beforeAll Supabase db reset in each spec that creates or modifies seeded shifts eliminates the cross-test pollution class.
  Source: S05-SUMMARY.md/Known Limitations, S05-SUMMARY.md/Follow-ups

- **Shared notification dispatch must surface missing provider configuration as an explicit degraded state.** Fabricating success when the notification provider is absent creates false observability. Surfacing 'provider-unconfigured' explicitly lets operators and tests distinguish healthy delivery from unset infrastructure.
  Source: S04-SUMMARY.md/Key Decisions

---

### Patterns

- **@repo/caluno-core as the single source of truth for shared product contracts.** Any rule that must behave identically on web and mobile belongs in a pure workspace package with zero Svelte/Capacitor imports. App-local wrappers import from core and add only runtime-specific glue. Avoids cross-app imports and keeps contracts testable with plain vitest.
  Source: S01-SUMMARY.md/Patterns Established, S02-SUMMARY.md/Patterns Established, S03-SUMMARY.md/Patterns Established

- **Mobile protected routes resolve access from one shaped trusted inventory snapshot.** Load the trusted inventory once at shell level; downstream routes consume it without re-querying. Denied states surface the reason, failure phase, and attempted id explicitly in the UI via data-* attributes.
  Source: S01-SUMMARY.md/Patterns Established

- **Shared offline/schedule contract in core; mobile/web adapters local.** The offline queue, mutation replay, continuity rules, and reconnect drain logic live in @repo/caluno-core. The mobile adapter wires Capacitor Preferences + the core contract; the web adapter wires browser localStorage + the same contract. No cross-app schema drift.
  Source: S02-SUMMARY.md/Patterns Established

- **One-shot arrival parsing + immediate query cleanup for URL-based mobile handoffs.** Read handoff query params exactly once on mount, apply them to the create sheet, then immediately replace the URL without them. Prevents duplicate application on re-render and keeps URL state clean for back navigation.
  Source: S03-SUMMARY.md/Patterns Established

- **Contract-focused E2E assertions over brittle inventories.** In mobile Playwright flows, assert metadata presence, fail-closed states, handoff shape, and UI behavior. Never assert exact item counts or ids that earlier specs may have changed. Use per-spec DB resets (beforeAll db reset) to eliminate cross-test state pollution.
  Source: S03-SUMMARY.md/Patterns Established, S05-SUMMARY.md/Patterns Established

- **Typed mobile notification adapters isolate Capacitor plugin parsing from UI/runtime code.** Parse all Capacitor notification plugin outputs in a dedicated adapter layer with explicit types. UI and runtime code never import Capacitor plugin objects directly — they consume typed domain values. Keeps UI code testable without Capacitor mock setup.
  Source: S04-SUMMARY.md/Patterns Established

- **Delivery-state harness pattern for notification E2E.** Stub edge functions in Playwright fixtures to capture per-calendar notification inventory. Assert on the captured delivery inventory (pending, delivered, suppressed) rather than polling OS APIs. Works reliably in CI without device provisioning.
  Source: S05-SUMMARY.md/Patterns Established

- **Best-effort dispatch via void-after-canonical-write.** Post-write side effects (shared-change notifications, telemetry) should be fired as void calls immediately after the canonical write succeeds — never awaited, never inside the mutation helper. Errors and timeouts in the side effect never affect the write result.
  Source: S05-SUMMARY.md/Patterns Established

---

### Surprises

- **S05 required a mid-slice replan.** The original 4-task S05 plan left 3 E2E tests failing after T04. A new task T05 was added targeting the specific trusted-offline route mode bug. The replan was clean and contained but the original plan did not anticipate that the trusted-online/trusted-offline distinction would require retrofitting existing E2E assertions in other specs.
  Source: S05-SUMMARY.md/Deviations

- **Two E2E test-code assertions remain stale at milestone close.** calendar-offline.spec.ts line 41 expects 'trusted-online' but production now correctly emits 'trusted-offline'. mobile-assembly.spec.ts phase 3 top-pick is execution-order sensitive when find-time-handoff.spec.ts runs first. Both are test-code issues only; production behavior is correct. These were known and accepted as follow-ups rather than blocking S05.
  Source: S05-SUMMARY.md/Known Limitations

- **The @repo/caluno-core extraction pattern paid off across all five slices.** Initially scoped to auth/scope contracts in S01, the pattern was applied in S02 (offline/schedule), S03 (find-time/ranking/prefill), and S04 (notification contracts) without friction. The pattern proved more broadly applicable than anticipated, removing the need for any cross-app imports across the entire milestone.
  Source: S01-SUMMARY.md through S04-SUMMARY.md/Patterns Established
