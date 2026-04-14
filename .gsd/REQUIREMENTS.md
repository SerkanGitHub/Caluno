# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Users can create an account, sign in, and continue using previously synced calendars offline with a cached session.
- Class: primary-user-loop
- Status: active
- Description: Users can create an account, sign in, and continue using previously synced calendars offline with a cached session.
- Why it matters: Offline continuity is part of the core promise for people coordinating around irregular schedules.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S03
- Validation: mapped
- Notes: Fresh sign-in remains an online operation; cached-session access must preserve previously synced data offline.

### R002 — Users can create groups, assign roles, and share calendars so only permitted members can access shared schedule data.
- Class: core-capability
- Status: active
- Description: Users can create groups, assign roles, and share calendars so only permitted members can access shared schedule data.
- Why it matters: Shared scheduling is the product foundation, not an add-on.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S04
- Validation: mapped
- Notes: Must support family/team style collaboration with role-based access.

### R003 — Users can create, edit, move, and delete multiple shifts per day, including recurring patterns, through browser calendar views.
- Class: core-capability
- Status: active
- Description: Users can create, edit, move, and delete multiple shifts per day, including recurring patterns, through browser calendar views.
- Why it matters: The system has to model real shift work instead of forcing single-shift calendar assumptions.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S05
- Validation: mapped
- Notes: M001 is web-first; scheduling interactions must be browser-verifiable.

### R004 — Previously synced schedule data can be read and edited locally in the browser while offline.
- Class: continuity
- Status: active
- Description: Previously synced schedule data can be read and edited locally in the browser while offline.
- Why it matters: Users need the schedule to remain usable when connectivity drops, not just visible.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: mapped
- Notes: M001 uses browser-local persistence as the main proof surface for offline behavior.

### R005 — Local-first schedule changes sync back to the backend deterministically, and live shared updates propagate to other group members when online.
- Class: integration
- Status: active
- Description: Local-first schedule changes sync back to the backend deterministically, and live shared updates propagate to other group members when online.
- Why it matters: Shared coordination breaks down if edits drift across users or devices.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S03, M001/S05
- Validation: mapped
- Notes: Server is canonical after reconnect; sync must remain observable and deterministic.

### R006 — The system warns users about baseline schedule conflicts such as overlapping shifts, double-booking, or conflicting edits that would silently change schedule meaning.
- Class: failure-visibility
- Status: active
- Description: The system warns users about baseline schedule conflicts such as overlapping shifts, double-booking, or conflicting edits that would silently change schedule meaning.
- Why it matters: A shared schedule is only trustworthy if obvious conflicts are visible before they cause coordination mistakes.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S02, M001/S04
- Validation: mapped
- Notes: M001 covers baseline conflicts only, not childcare-specific domain policies.

### R007 — The browser scheduling experience is stress-friendly, clear, fast, and accessible enough for everyday coordination work.
- Class: quality-attribute
- Status: active
- Description: The browser scheduling experience is stress-friendly, clear, fast, and accessible enough for everyday coordination work.
- Why it matters: This product serves users under time pressure; a cluttered or brittle UI defeats the point of the tool.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S05
- Validation: mapped
- Notes: Large targets, clean layout, strong contrast, and low-clutter interaction should shape implementation choices.

### R008 — Caluno computes shared free-time windows across two or more users and explains why a suggested window works.
- Class: differentiator
- Status: active
- Description: Caluno computes shared free-time windows across two or more users and explains why a suggested window works.
- Why it matters: Shared free-time matching is the core product differentiator once the substrate is trustworthy.
- Source: user
- Primary owning slice: M002 (provisional)
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to M002 after the scheduling substrate is proven.

### R009 — The product remains coherent across web and mobile surfaces, with mobile added on top of the same scheduling substrate and domain model.
- Class: launchability
- Status: active
- Description: The product remains coherent across web and mobile surfaces, with mobile added on top of the same scheduling substrate and domain model.
- Why it matters: Caluno is intended to work where coordination actually happens, across both browser and phone contexts.
- Source: user
- Primary owning slice: M003 (provisional)
- Supporting slices: none
- Validation: unmapped
- Notes: M001 proves the substrate on web first because that is the available test surface.

### R010 — Users receive reminders and change notifications for important schedule updates without undermining the calmness of the product.
- Class: continuity
- Status: active
- Description: Users receive reminders and change notifications for important schedule updates without undermining the calmness of the product.
- Why it matters: Reminder continuity matters, but it should sit on top of a stable calendar foundation rather than distort the first milestone.
- Source: user
- Primary owning slice: M003 (provisional)
- Supporting slices: none
- Validation: unmapped
- Notes: Planned after the substrate is stable; not part of M001.

### R011 — Caluno provides predictive scheduling assistance that helps users anticipate better coordination options from their real schedule data.
- Class: differentiator
- Status: active
- Description: Caluno provides predictive scheduling assistance that helps users anticipate better coordination options from their real schedule data.
- Why it matters: Predictive help is part of the long-term vision, but it depends on trustworthy schedule data and matching foundations.
- Source: user
- Primary owning slice: M004 (provisional)
- Supporting slices: none
- Validation: unmapped
- Notes: Planned after substrate and matching work; not part of M001.

### R012 — Authentication, row-level policies, and sharing rules prevent cross-group data leakage and limit each user to calendars they are permitted to access.
- Class: compliance/security
- Status: active
- Description: Authentication, row-level policies, and sharing rules prevent cross-group data leakage and limit each user to calendars they are permitted to access.
- Why it matters: The product cannot be trusted if shared calendar data leaks across groups or roles.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S04
- Validation: mapped
- Notes: Supabase Auth and RLS are part of the chosen backend direction.

## Deferred

### R013 — Caluno can suggest optional activities or plans based on matched time windows.
- Class: admin/support
- Status: deferred
- Description: Caluno can suggest optional activities or plans based on matched time windows.
- Why it matters: This can add value later, but it is not required to prove the scheduling product works.
- Source: research
- Validation: unmapped
- Notes: Useful later, but not part of the core scheduling or matching substrate now.

### R014 — Users can trade or hand off shifts inside a team workflow.
- Class: admin/support
- Status: deferred
- Description: Users can trade or hand off shifts inside a team workflow.
- Why it matters: Shift trading is a plausible extension, but it adds workflow and policy complexity beyond the current product boundary.
- Source: research
- Validation: unmapped
- Notes: Deferred because the current product focus is coordination clarity, not workforce exchange flows.

### R015 — Caluno can produce summary views such as monthly best days to meet.
- Class: admin/support
- Status: deferred
- Description: Caluno can produce summary views such as monthly best days to meet.
- Why it matters: This depends on later matching intelligence and is not needed to launch the core product.
- Source: research
- Validation: unmapped
- Notes: Deferred until matching and predictive layers exist.

### R016 — Caluno can generate AI-assisted shift plans or scheduling proposals.
- Class: differentiator
- Status: deferred
- Description: Caluno can generate AI-assisted shift plans or scheduling proposals.
- Why it matters: This is explicitly later and should not distort the core product sequencing.
- Source: user
- Validation: unmapped
- Notes: User marked this as future optional; do not plan it into the current roadmap.

## Out of Scope

### R017 — Caluno does not include chat or messaging features.
- Class: anti-feature
- Status: out-of-scope
- Description: Caluno does not include chat or messaging features.
- Why it matters: This keeps the product focused on scheduling clarity rather than general communication.
- Source: user
- Validation: n/a
- Notes: Prevents collaboration scope from expanding into social communication tooling.

### R018 — Caluno does not become a social network product.
- Class: anti-feature
- Status: out-of-scope
- Description: Caluno does not become a social network product.
- Why it matters: This avoids drifting away from the scheduling problem the product exists to solve.
- Source: user
- Validation: n/a
- Notes: No feeds, social graph mechanics, or engagement loops.

### R019 — Caluno does not expand into enterprise workforce management in the current vision.
- Class: constraint
- Status: out-of-scope
- Description: Caluno does not expand into enterprise workforce management in the current vision.
- Why it matters: This prevents roadmap pressure toward staffing software complexity that does not serve the current product.
- Source: user
- Validation: n/a
- Notes: The target is shared personal and small-group coordination, not enterprise staffing operations.

### R020 — Caluno does not include complex analytics dashboards.
- Class: anti-feature
- Status: out-of-scope
- Description: Caluno does not include complex analytics dashboards.
- Why it matters: Heavy dashboards would add noise and complexity without helping the core coordination loop.
- Source: user
- Validation: n/a
- Notes: Keep the interface focused on action and clarity, not reporting depth.

### R021 — Caluno does not target medical-grade documentation or clinical recordkeeping.
- Class: constraint
- Status: out-of-scope
- Description: Caluno does not target medical-grade documentation or clinical recordkeeping.
- Why it matters: This keeps the product boundary away from compliance-heavy domains that are not part of the current goal.
- Source: user
- Validation: n/a
- Notes: Healthcare workers are in scope as users, but regulated medical documentation is not.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | active | M001/S01 | M001/S03 | mapped |
| R002 | core-capability | active | M001/S01 | M001/S04 | mapped |
| R003 | core-capability | active | M001/S02 | M001/S05 | mapped |
| R004 | continuity | active | M001/S03 | M001/S04 | mapped |
| R005 | integration | active | M001/S04 | M001/S03, M001/S05 | mapped |
| R006 | failure-visibility | active | M001/S05 | M001/S02, M001/S04 | mapped |
| R007 | quality-attribute | active | M001/S02 | M001/S03, M001/S05 | mapped |
| R008 | differentiator | active | M002 (provisional) | none | unmapped |
| R009 | launchability | active | M003 (provisional) | none | unmapped |
| R010 | continuity | active | M003 (provisional) | none | unmapped |
| R011 | differentiator | active | M004 (provisional) | none | unmapped |
| R012 | compliance/security | active | M001/S01 | M001/S04 | mapped |
| R013 | admin/support | deferred | none | none | unmapped |
| R014 | admin/support | deferred | none | none | unmapped |
| R015 | admin/support | deferred | none | none | unmapped |
| R016 | differentiator | deferred | none | none | unmapped |
| R017 | anti-feature | out-of-scope | none | none | n/a |
| R018 | anti-feature | out-of-scope | none | none | n/a |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | anti-feature | out-of-scope | none | none | n/a |
| R021 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 12
- Mapped to slices: 12
- Validated: 0
- Unmapped active requirements: 0
