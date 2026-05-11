# M005: Predictive assistance and release hardening

**Vision:** Deliver predictive scheduling assistance and harden the product for launch, building on the now-complete cross-platform coordination loop from M001–M004. Users get smarter coordination help derived from their real schedule data, and the product is reliable, accessible, and deployable.

## Success Criteria

- Predictive or anticipatory scheduling features are live and covered by unit and E2E tests
- R011 (predictive scheduling assistance) is validated
- Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed
- UX is refined for calmness, polish, and fit/finish
- All trust, privacy, and authorization constraints from prior milestones are maintained
- Explicit UI and diagnostics exist for predictive features and hardening outcomes

## Slices

- [x] **S01: S01** `risk:low` `depends:[]`
  > After this: A written feature brief (M005-CONTEXT.md) with specific predictive features scoped, explicit launch criteria, and a decomposed slice roadmap.

- [x] **S02: S02** `risk:low` `depends:[]`
  > After this: Unit tests pass for both helpers. detectRecurrencePattern returns a suggestion for ≥3 same-weekday-same-hour shifts in 30 days and null otherwise. previewShiftConflicts returns overlapping shifts for a draft against existing shifts and empty array when clear.

- [x] **S03: S03** `risk:medium` `depends:[]`
  > After this: Opening the web shift create dialog on a calendar with a known pattern surfaces a suggestion chip. Accepting pre-fills recurrence fields. Dismissing leaves the form blank. Browser E2E covers both paths.

- [x] **S04: S04** `risk:medium` `depends:[]`
  > After this: Creating a shift on web that would overlap an existing one shows a non-blocking advisory before confirm. The user can still save. Browser E2E covers conflict and clear scenarios.

- [ ] **S05: S05** `risk:medium` `depends:[]`
  > After this: ShiftEditorSheet on mobile renders both the suggestion chip and the clash advisory when applicable. Playwright mobile smoke passes.

- [ ] **S06: Hardening, accessibility, and deployment readiness** `risk:low` `depends:[S05]`
  > After this: axe-core scan reports zero new WCAG 2.1 AA violations. Stale M004 E2E assertions fixed. pnpm build passes for web and mobile. R011 marked validated.

## Boundary Map

Not provided.
