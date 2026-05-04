---
verdict: needs-attention
remediation_round: 0
---

# Milestone Validation: M003

## Success Criteria Checklist
- [x] **AC1: Sign in, permitted calendars, native-feeling core loop (view/create/edit shifts)** | S01 proves trusted sign-in, permitted-only inventory, and denied states via unit + Playwright. S02 delivers the phone-first mobile week board and shift editor with local-first create/edit/move/delete. Capacitor iOS sync confirms native packaging.

- [x] **AC2: Previously synced calendar reopens offline; offline edits survive close/reopen; reconnect reconciles through trusted path** | S02 validated end-to-end: Capacitor Preferences-backed continuity, fail-closed unsynced denial, offline edit persistence across reload, and deterministic reconnect drain. S05 adds `trusted-offline` route-mode tracking for connectivity-loss transitions.

- [x] **AC3: Find time online → compact results → chosen slot into shift creation; offline fails closed** | S03 validated: compact Top picks + browse windows, exact slot handoff into existing `ShiftEditorSheet`, one-shot query param cleanup, and explicit fail-closed offline/denied states. 10/10 Playwright tests passed.

- [ ] **AC4: Per-device/per-calendar notification control; enabled notifies, disabled stays quiet, duplicates suppressed, taps land in right context** | S04 validated toggle persistence, degraded states, routing. S05 validated at unit level (17 mobile + 12 web tests). **Gap:** 2 of 21 E2E specs fail (stale test-code assertions in `calendar-offline.spec.ts` line 41 and `mobile-assembly.spec.ts` phase 3). Real provider-backed push delivery remains `provider-unconfigured` — end-to-end notification delivery to a real device/OS has not been demonstrated.

## Slice Delivery Audit
| Slice | SUMMARY.md | Verification Result | Outstanding Issues |
|---|---|---|---|
| S01 | ✅ Present | ✅ passed | None |
| S02 | ✅ Present | ✅ passed | None |
| S03 | ✅ Present | ✅ passed | None |
| S04 | ✅ Present | ✅ passed | None |
| S05 | ✅ Present | ✅ passed (with caveats) | 2 known-failing E2E assertions (stale test code); no S05-UAT.md; `requires` frontmatter is empty (`[]`) leaving S04→S05 and S03→S05 boundaries undeclared |

All 5 slices have SUMMARY.md files and reported `verification_result: passed`. S05 has known follow-ups: 2/21 E2E test assertions are stale (per S05 SUMMARY, attributed to test-code issues not production defects), no `S05-UAT.md` was produced for the final assembled mobile experience, and the `requires` field in S05 frontmatter does not declare its S03 and S04 dependencies.

## Cross-Slice Integration
| Boundary | Producer Evidence | Consumer Evidence | Status |
|---|---|---|---|
| **S01 → S02** | S01 `provides`: shared `@repo/caluno-core` trust contract, fail-closed mobile auth/bootstrap, phone-first groups/calendar shell with permitted inventory and denied states | S02 `requires.S01`: "Trusted mobile auth bootstrap, shaped permitted inventory, denied-state shell, and sign-out/invalid-session guardrails that S02 extends into offline continuity and calendar editing." | ✅ PASS |
| **S01 → S03** | S01 `provides` mobile Playwright auth/scope harness, phone-first groups/calendar routes, and the `caluno-core` route contract | S03 `requires.S01`: "Trusted mobile shell, auth, and permitted calendar inventory / denial semantics for route entry." | ✅ PASS |
| **S02 → S03** | S02 `provides`: mobile create/edit sheet (`ShiftEditorSheet.svelte`), mobile offline controller/runtime/transport, week board surface, sync-strip diagnostics | S03 `requires.S02`: "Mobile calendar continuity runtime, existing create/edit sheet, and local-first reconnect surfaces used by the handoff destination." Explicitly reuses `ShiftEditorSheet` for handoff. | ✅ PASS |
| **S02 → S04** | S02 `provides`: Preferences-backed continuity store, local-first controller/runtime/transport, reconnect drain, `@capacitor/network`/`@capacitor/app` plugin wiring | S04 `requires.S02`: "Trusted synced-week repository data, reconnect/lifecycle seams, and mobile calendar context used for deterministic reminder scheduling and resync." | ✅ PASS |
| **S04 → S05** | S04 `provides`: per-device/per-calendar preference persistence, deterministic local reminder scheduling/cancellation, truthful toggle state, safe notification tap routing, provider-neutral dispatch seam | S05 `requires`: listed as `[]` in frontmatter — **no explicit declaration**. However S05 narrative confirms consumption: references `CalendarNotificationToggle`, upgrades notification harness, and wires dispatch into mobile transport/controller. | ⚠️ NEEDS-ATTENTION (metadata gap only; functional dependency confirmed) |
| **S03 → S05** | S03 `provides`: compact mobile Find time route, exact slot-to-create handoff into `ShiftEditorSheet`, shared matcher/ranking/prefill contracts, E2E proof surfaces | S05 `requires`: listed as `[]` in frontmatter — **no explicit declaration**. S05 narrative references `find-time-handoff.spec.ts` and phase 3 of the assembly spec exercising Find time handoff. | ⚠️ NEEDS-ATTENTION (metadata gap only; functional dependency confirmed) |

All six boundary dependencies are honored in practice (production code and tests confirm the artifact flows). S05's `requires` frontmatter field is empty (`[]`), leaving the S04→S05 and S03→S05 boundaries undeclared at the contract level. The integration is real; the metadata is incomplete.

## Requirement Coverage
| Requirement | Status | Evidence |
|---|---|---|
| **R002** — Permitted-scope and fail-closed denied-route contract extended to mobile | **COVERED** | S01: shared `@repo/caluno-core` helpers proven in 18 unit tests + 3 Playwright specs covering `calendar-missing`, `calendar-id-invalid`, out-of-scope denial, reload continuity, and invalid-session rejection. S03: contract extended to Find time route — out-of-scope calendars never reveal or query matching data, proven via `auth-scope.spec.ts` regression + `find-time-handoff.spec.ts`. Web regressions (`protected-routes.unit.test.ts`, 27 tests) confirmed no fork of existing denial semantics. |
| **R009** — `apps/mobile` turned into a real auth/scope shell with mobile UI, shared contracts, E2E proof, and native packaging | **COVERED** | S01: singleton mobile session store, phone-first groups/calendar routes, MobileShell, iOS Capacitor sync, seeded Playwright harness. S02: shared continuity/schedule contract in `@repo/caluno-core`, mobile week board/editor, offline reopen, reconnect drain, `cap sync` with `@capacitor/app`/`@capacitor/network`/`@capacitor/preferences`. S03: Find time handoff validated. S04: per-device/per-calendar notification toggle verified. S05: full assembled mobile proof with unit + E2E verification passing. |

Both R002 and R009 are fully covered with named test files, passing verification commands, and explicit E2E proof across multiple slices.

## Verification Class Compliance
| Class | Planned Check | Evidence | Verdict |
|---|---|---|---|
| **Contract** | Unit/integration coverage for shared mobile contracts, auth/scope loading, offline pending/reconnect, notification preference rules, duplicate suppression, and notification-open landing | S01: 18 unit tests (trusted-core, auth-bootstrap, shell-scope) + 27 web regression tests. S02: 3 mobile unit suites (continuity-contract, mobile-continuity, mobile-sync-runtime) + 5 web offline/schedule suites. S03: 16 mobile unit tests (find-time-contract, mobile-find-time, mobile-create-prefill) + 43 web regression tests. S04: 22 unit tests (continuity, notification-contract, runtime, router). S05: 21 web dispatch tests + 17 mobile contract + 4 mobile runtime tests. | ✅ Pass |
| **Integration** | Assembled mobile app in real Capacitor runtime against trusted backend and notification/runtime boundaries; browser-only proof insufficient | Capacitor sync confirmed in S01, S02, S03, S04 with native plugin packaging (`@capacitor/app`, `@capacitor/network`, `@capacitor/preferences`, local/push notifications). `pnpm cap:sync` passed each slice. Local Supabase reset + Playwright proved auth/scope/offline/find-time/notifications sequentially. **Gap:** real provider-backed push delivery remains `provider-unconfigured`; no proof against an actual device or push provider. | ⚠️ Partial |
| **Operational** | Close/reopen, offline reopen, reconnect drain, notification permission changes, push registration changes, notification-open routing | S02: offline reopen, reload persistence, reconnect drain, corrupt-continuity rejection proven in Playwright. S04: permission-denied, registration-failed, provider-unconfigured, and path-rejected reason codes surfaced. S05: `trusted-offline` route-mode added for connectivity-loss tracking. **Gap:** 2 E2E tests known-failing (stale assertions in `calendar-offline.spec.ts` line 41 and `mobile-assembly.spec.ts` phase 3); full E2E bar runs at 19/21, not 21/21. | ⚠️ Partial |
| **UAT** | Human check: app feels native and focused, core actions easy to reach, notification behavior calm not noisy | No `S05-UAT.md` found. S01–S04 each have UAT.md files. Final assembled `mobile-assembly.spec.ts` is automated, not a human walkthrough. | ❌ Gap |


## Verdict Rationale
All five slices have SUMMARY.md files with `verification_result: passed`, both advanced requirements (R002 and R009) are fully covered with named tests and E2E proof, and all six cross-slice boundary dependencies are functionally honored. However, three attention items prevent a clean pass: (1) AC4 / Operational has 2 known-failing E2E assertions left as stale test-code follow-ups rather than fixed; (2) real provider-backed push notification delivery to an actual device remains undemonstrated (`provider-unconfigured`); and (3) S05 has no UAT.md and the `requires` frontmatter omits its S03/S04 dependencies, leaving the final assembled-mobile UAT and contract metadata incomplete.
