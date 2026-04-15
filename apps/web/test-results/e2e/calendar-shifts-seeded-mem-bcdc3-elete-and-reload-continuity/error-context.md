# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-shifts.spec.ts >> seeded member can prove multi-shift load plus recurring create, edit, move, delete, and reload continuity
- Location: tests/e2e/calendar-shifts.spec.ts:26:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('day-column-2026-04-17')
Expected substring: "Recurring coverage drill"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for getByTestId('day-column-2026-04-17')

```

# Page snapshot

```yaml
- main [ref=e4]:
  - complementary [ref=e5]:
    - paragraph [ref=e6]: Trusted calendar scope
    - heading "Bob Member" [level=1] [ref=e7]
    - paragraph [ref=e8]: This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.
    - generic [ref=e9]:
      - article [ref=e10]:
        - generic [ref=e11]: Route state
        - strong [ref=e12]: trusted-online
        - paragraph [ref=e13]: Week data and calendar scope came from the trusted server route.
      - article [ref=e14]:
        - generic [ref=e15]: Local-first state
        - strong [ref=e16]: online
        - paragraph [ref=e17]: The visible week is rendering from the trusted server snapshot.
        - code [ref=e18]: 0 pending / 0 retryable
      - article [ref=e19]:
        - generic [ref=e20]: Week scope
        - strong [ref=e21]: 2026-04-13
        - paragraph [ref=e22]: The requested visible week resolved successfully.
        - code [ref=e23]: server-sync
    - navigation [ref=e24]:
      - link "Back to groups" [ref=e25] [cursor=pointer]:
        - /url: /groups
      - link "Sign out" [ref=e26] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e27]:
    - generic [ref=e28]:
      - paragraph [ref=e29]: Alpha Team
      - heading "Alpha shared" [level=2] [ref=e30]
      - paragraph [ref=e31]: "A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation."
      - generic [ref=e32]:
        - generic [ref=e33]: Default calendar
        - generic [ref=e34]: member access
        - generic [ref=e35]: 8 visible shifts
        - generic [ref=e36]: Trusted online
    - generic [ref=e37]:
      - generic [ref=e38]:
        - generic [ref=e39]:
          - paragraph [ref=e40]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e41]
          - paragraph [ref=e42]: Visible week chosen from the route query.
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]: "Visible week start: 2026-04-13"
            - generic [ref=e46]: 8 shifts
            - generic [ref=e47]: UTC board
            - generic [ref=e48]: Server-synced board
            - generic [ref=e49]: Online
            - generic [ref=e50]: No pending local writes
          - navigation "Visible week navigation" [ref=e51]:
            - link "Previous week" [ref=e52] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e53] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e54]:
        - group [ref=e55]:
          - generic "Plan a shift" [ref=e56] [cursor=pointer]
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]:
                - paragraph [ref=e60]: Local-first create
                - heading "Create a shift" [level=3] [ref=e61]
              - generic [ref=e62]: UTC times
            - generic [ref=e63]:
              - group [ref=e64]:
                - generic [ref=e65]:
                  - generic [ref=e66]: Title
                  - textbox "Title" [active] [ref=e67]:
                    - /placeholder: Opening shift
                - generic [ref=e68]:
                  - generic [ref=e69]:
                    - generic [ref=e70]: Start
                    - textbox "Start" [ref=e71]: 2026-04-13T09:00
                  - generic [ref=e72]:
                    - generic [ref=e73]: End
                    - textbox "End" [ref=e74]: 2026-04-13T13:00
                - generic [ref=e75]:
                  - generic [ref=e76]:
                    - generic [ref=e77]:
                      - paragraph [ref=e78]: Bounded recurrence
                      - heading "Optional repeat rule" [level=3] [ref=e79]
                    - generic [ref=e80]: Count or until required
                  - generic [ref=e81]:
                    - group [ref=e82]:
                      - generic [ref=e83]: Cadence
                      - generic [ref=e84]:
                        - generic [ref=e85] [cursor=pointer]:
                          - radio "One-off No repeats" [ref=e86]
                          - strong [ref=e87]: One-off
                          - generic [ref=e88]: No repeats
                        - generic [ref=e89] [cursor=pointer]:
                          - radio "Daily Every day" [checked] [ref=e90]
                          - strong [ref=e91]: Daily
                          - generic [ref=e92]: Every day
                        - generic [ref=e93] [cursor=pointer]:
                          - radio "Weekly Weekly cadence" [ref=e94]
                          - strong [ref=e95]: Weekly
                          - generic [ref=e96]: Weekly cadence
                        - generic [ref=e97] [cursor=pointer]:
                          - radio "Monthly Monthly cadence" [ref=e98]
                          - strong [ref=e99]: Monthly
                          - generic [ref=e100]: Monthly cadence
                    - generic [ref=e101]:
                      - generic [ref=e102]: Interval
                      - spinbutton "Interval" [ref=e103]
                    - generic [ref=e104]:
                      - generic [ref=e105]: Repeat count
                      - spinbutton "Repeat count" [ref=e106]: "3"
                    - generic [ref=e107]:
                      - generic [ref=e108]: Repeat until
                      - textbox "Repeat until" [ref=e109]
              - generic [ref=e110]:
                - button "Save shift" [ref=e111] [cursor=pointer]
                - generic [ref=e112]: The board updates locally first, then waits for trusted server confirmation when online.
        - generic [ref=e113]:
          - paragraph [ref=e114]: Board rhythm
          - paragraph [ref=e115]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - generic [ref=e116]:
        - generic [ref=e117]:
          - generic [ref=e118]:
            - generic [ref=e119]:
              - paragraph [ref=e120]: Monday
              - heading "Apr 13" [level=3] [ref=e121]
            - generic [ref=e123]: 1 shift
          - article [ref=e125]:
            - generic [ref=e126]:
              - generic [ref=e127]:
                - paragraph [ref=e128]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e129]
              - generic [ref=e130]:
                - generic [ref=e131]: 08:30 → 09:00
                - generic [ref=e132]: Occurrence 1
            - generic [ref=e133]:
              - generic [ref=e134]:
                - text: Window
                - strong [ref=e135]: 08:30 → 09:00
              - generic [ref=e136]:
                - text: Duration
                - strong [ref=e137]: 0.5h block
              - generic [ref=e138]:
                - text: Shift id
                - code [ref=e139]: aaaaaaaa-8888-1111-1111-111111111111
            - generic [ref=e140]:
              - group [ref=e141]:
                - generic "Edit details" [ref=e142] [cursor=pointer]
              - group [ref=e143]:
                - generic "Move timing" [ref=e144] [cursor=pointer]
              - button "Delete shift" [ref=e146] [cursor=pointer]
        - generic [ref=e147]:
          - generic [ref=e148]:
            - generic [ref=e149]:
              - paragraph [ref=e150]: Tuesday
              - heading "Apr 14" [level=3] [ref=e151]
            - generic [ref=e153]: 1 shift
          - article [ref=e155]:
            - generic [ref=e156]:
              - generic [ref=e157]:
                - paragraph [ref=e158]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e159]
              - generic [ref=e160]:
                - generic [ref=e161]: 08:30 → 09:00
                - generic [ref=e162]: Occurrence 2
            - generic [ref=e163]:
              - generic [ref=e164]:
                - text: Window
                - strong [ref=e165]: 08:30 → 09:00
              - generic [ref=e166]:
                - text: Duration
                - strong [ref=e167]: 0.5h block
              - generic [ref=e168]:
                - text: Shift id
                - code [ref=e169]: aaaaaaaa-8888-1111-1111-222222222222
            - generic [ref=e170]:
              - group [ref=e171]:
                - generic "Edit details" [ref=e172] [cursor=pointer]
              - group [ref=e173]:
                - generic "Move timing" [ref=e174] [cursor=pointer]
              - button "Delete shift" [ref=e176] [cursor=pointer]
        - generic [ref=e177]:
          - generic [ref=e178]:
            - generic:
              - paragraph: Wednesday
              - heading "Apr 15" [level=3]
            - generic [ref=e179]:
              - generic [ref=e180]: Today
              - generic [ref=e181]: 3 shifts
          - generic [ref=e182]:
            - article [ref=e183]:
              - generic [ref=e184]:
                - generic [ref=e185]:
                  - paragraph [ref=e186]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e187]
                - generic [ref=e188]:
                  - generic [ref=e189]: 08:30 → 09:00
                  - generic [ref=e190]: Occurrence 3
              - generic [ref=e191]:
                - generic [ref=e192]:
                  - text: Window
                  - strong [ref=e193]: 08:30 → 09:00
                - generic [ref=e194]:
                  - text: Duration
                  - strong [ref=e195]: 0.5h block
                - generic [ref=e196]:
                  - text: Shift id
                  - code [ref=e197]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e198]:
                - group [ref=e199]:
                  - generic "Edit details" [ref=e200] [cursor=pointer]
                - group [ref=e201]:
                  - generic "Move timing" [ref=e202] [cursor=pointer]
                - button "Delete shift" [ref=e204] [cursor=pointer]
            - article [ref=e205]:
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - paragraph [ref=e208]: One-off shift
                  - heading "Morning intake" [level=3] [ref=e209]
                - generic [ref=e211]: 09:00 → 11:00
              - generic [ref=e212]:
                - generic [ref=e213]:
                  - text: Window
                  - strong [ref=e214]: 09:00 → 11:00
                - generic [ref=e215]:
                  - text: Duration
                  - strong [ref=e216]: 2h block
                - generic [ref=e217]:
                  - text: Shift id
                  - code [ref=e218]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e219]:
                - group [ref=e220]:
                  - generic "Edit details" [ref=e221] [cursor=pointer]
                - group [ref=e222]:
                  - generic "Move timing" [ref=e223] [cursor=pointer]
                - button "Delete shift" [ref=e225] [cursor=pointer]
            - article [ref=e226]:
              - generic [ref=e227]:
                - generic [ref=e228]:
                  - paragraph [ref=e229]: One-off shift
                  - heading "Afternoon handoff" [level=3] [ref=e230]
                - generic [ref=e232]: 13:00 → 15:00
              - generic [ref=e233]:
                - generic [ref=e234]:
                  - text: Window
                  - strong [ref=e235]: 13:00 → 15:00
                - generic [ref=e236]:
                  - text: Duration
                  - strong [ref=e237]: 2h block
                - generic [ref=e238]:
                  - text: Shift id
                  - code [ref=e239]: aaaaaaaa-6666-1111-1111-222222222222
              - generic [ref=e240]:
                - group [ref=e241]:
                  - generic "Edit details" [ref=e242] [cursor=pointer]
                - group [ref=e243]:
                  - generic "Move timing" [ref=e244] [cursor=pointer]
                - button "Delete shift" [ref=e246] [cursor=pointer]
        - generic [ref=e247]:
          - generic [ref=e248]:
            - generic [ref=e249]:
              - paragraph [ref=e250]: Thursday
              - heading "Apr 16" [level=3] [ref=e251]
            - generic [ref=e253]: 3 shifts
          - generic [ref=e254]:
            - article [ref=e255]:
              - generic [ref=e256]:
                - generic [ref=e257]:
                  - paragraph [ref=e258]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e259]
                - generic [ref=e260]:
                  - generic [ref=e261]: 08:30 → 09:00
                  - generic [ref=e262]: Occurrence 4
              - generic [ref=e263]:
                - generic [ref=e264]:
                  - text: Window
                  - strong [ref=e265]: 08:30 → 09:00
                - generic [ref=e266]:
                  - text: Duration
                  - strong [ref=e267]: 0.5h block
                - generic [ref=e268]:
                  - text: Shift id
                  - code [ref=e269]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e270]:
                - group [ref=e271]:
                  - generic "Edit details" [ref=e272] [cursor=pointer]
                - group [ref=e273]:
                  - generic "Move timing" [ref=e274] [cursor=pointer]
                - button "Delete shift" [ref=e276] [cursor=pointer]
            - article [ref=e277]:
              - generic [ref=e278]:
                - generic [ref=e279]:
                  - paragraph [ref=e280]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e281]
                - generic [ref=e283]: 12:00 → 14:00
              - generic [ref=e284]:
                - generic [ref=e285]:
                  - text: Window
                  - strong [ref=e286]: 12:00 → 14:00
                - generic [ref=e287]:
                  - text: Duration
                  - strong [ref=e288]: 2h block
                - generic [ref=e289]:
                  - text: Shift id
                  - code [ref=e290]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e291]:
                - group [ref=e292]:
                  - generic "Edit details" [ref=e293] [cursor=pointer]
                - group [ref=e294]:
                  - generic "Move timing" [ref=e295] [cursor=pointer]
                - button "Delete shift" [ref=e297] [cursor=pointer]
            - article [ref=e298]:
              - generic [ref=e299]:
                - generic [ref=e300]:
                  - paragraph [ref=e301]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e302]
                - generic [ref=e304]: 13:00 → 15:00
              - generic [ref=e305]:
                - generic [ref=e306]:
                  - text: Window
                  - strong [ref=e307]: 13:00 → 15:00
                - generic [ref=e308]:
                  - text: Duration
                  - strong [ref=e309]: 2h block
                - generic [ref=e310]:
                  - text: Shift id
                  - code [ref=e311]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e312]:
                - group [ref=e313]:
                  - generic "Edit details" [ref=e314] [cursor=pointer]
                - group [ref=e315]:
                  - generic "Move timing" [ref=e316] [cursor=pointer]
                - button "Delete shift" [ref=e318] [cursor=pointer]
        - generic [ref=e319]:
          - generic [ref=e320]:
            - generic [ref=e321]:
              - paragraph [ref=e322]: Friday
              - heading "Apr 17" [level=3] [ref=e323]
            - generic [ref=e325]: 0 shifts
          - article [ref=e326]:
            - paragraph [ref=e327]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e328]
            - paragraph [ref=e329]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e330]:
          - generic [ref=e331]:
            - generic [ref=e332]:
              - paragraph [ref=e333]: Saturday
              - heading "Apr 18" [level=3] [ref=e334]
            - generic [ref=e336]: 0 shifts
          - article [ref=e337]:
            - paragraph [ref=e338]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e339]
            - paragraph [ref=e340]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e341]:
          - generic [ref=e342]:
            - generic [ref=e343]:
              - paragraph [ref=e344]: Sunday
              - heading "Apr 19" [level=3] [ref=e345]
            - generic [ref=e347]: 0 shifts
          - article [ref=e348]:
            - paragraph [ref=e349]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e350]
            - paragraph [ref=e351]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e352]:
      - generic [ref=e353]:
        - generic [ref=e354]:
          - paragraph [ref=e355]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e356]
        - generic [ref=e357]: 2 visible
      - generic [ref=e358]:
        - link "Alpha shared Default calendar" [ref=e359] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e360]: Alpha shared
          - generic [ref=e361]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e362] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e363]: Alpha backlog
          - generic [ref=e364]: Secondary calendar
```

# Test source

```ts
  23  |   return dayColumn(page, dayKey).getByTestId(`shift-card-${shiftId}`);
  24  | }
  25  | 
  26  | test('seeded member can prove multi-shift load plus recurring create, edit, move, delete, and reload continuity', async ({
  27  |   page,
  28  |   flow
  29  | }) => {
  30  |   await test.step('phase: sign in and open the deterministic seeded week', async () => {
  31  |     flow.mark('login', seededUsers.alphaMember.email);
  32  |     await signInThroughUi(page, seededUsers.alphaMember);
  33  |     await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
  34  |     await expect(page.getByRole('heading', { name: seededUsers.alphaMember.expectedGroups[0] })).toBeVisible();
  35  | 
  36  |     await openCalendarWeek({
  37  |       page,
  38  |       flow,
  39  |       calendarId: seededCalendars.alphaShared,
  40  |       visibleWeekStart: seededSchedule.visibleWeek.start,
  41  |       focusShiftIds: [
  42  |         seededSchedule.shifts.morningIntake.id,
  43  |         seededSchedule.shifts.afternoonHandoff.id,
  44  |         seededSchedule.shifts.supplierCall.id
  45  |       ],
  46  |       phase: 'open-seeded-week'
  47  |     });
  48  | 
  49  |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  50  |     await expect(page.getByTestId('schedule-load-state')).toHaveCount(0);
  51  |   });
  52  | 
  53  |   await test.step('phase: prove same-day multi-shift state is visible on load', async () => {
  54  |     flow.mark('verify-seeded-load', seededSchedule.visibleWeek.start);
  55  |     flow.setContext({
  56  |       note: 'verifying seeded same-day multi-shift load',
  57  |       focusShiftIds: [
  58  |         seededSchedule.shifts.alphaOpeningSweepWednesday.id,
  59  |         seededSchedule.shifts.morningIntake.id,
  60  |         seededSchedule.shifts.afternoonHandoff.id,
  61  |         seededSchedule.shifts.alphaOpeningSweepThursday.id,
  62  |         seededSchedule.shifts.kitchenPrep.id,
  63  |         seededSchedule.shifts.supplierCall.id
  64  |       ]
  65  |     });
  66  | 
  67  |     const visibleWeek = await readVisibleWeekFromBoard(page);
  68  |     expect(visibleWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
  69  |     expect(visibleWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
  70  | 
  71  |     const wednesdayColumn = dayColumn(page, '2026-04-15');
  72  |     await expect(wednesdayColumn.locator('[data-testid^="shift-card-"]')).toHaveCount(3);
  73  |     await expect(wednesdayColumn).toContainText('Alpha opening sweep');
  74  |     await expect(wednesdayColumn).toContainText('Morning intake');
  75  |     await expect(wednesdayColumn).toContainText('Afternoon handoff');
  76  | 
  77  |     const thursdayColumn = dayColumn(page, '2026-04-16');
  78  |     await expect(thursdayColumn.locator('[data-testid^="shift-card-"]')).toHaveCount(3);
  79  |     await expect(thursdayColumn).toContainText('Alpha opening sweep');
  80  |     await expect(thursdayColumn).toContainText('Kitchen prep');
  81  |     await expect(thursdayColumn).toContainText('Supplier call');
  82  |   });
  83  | 
  84  |   await test.step('phase: fail a bounded recurring create once, then create concrete occurrences across the visible week', async () => {
  85  |     flow.mark('create-recurring-validation', seededSchedule.recurringCreate.title);
  86  |     flow.setContext({
  87  |       note: 'provoking create validation error before successful bounded recurrence',
  88  |       focusShiftIds: []
  89  |     });
  90  | 
  91  |     const createDialog = page.locator('details.shift-editor--create');
  92  |     await createDialog.locator('summary').click();
  93  |     await createDialog.locator('input[name="title"]').fill(seededSchedule.recurringCreate.title);
  94  |     await createDialog.locator('input[name="startAt"]').fill(seededSchedule.recurringCreate.startLocal);
  95  |     await createDialog.locator('input[name="endAt"]').fill(seededSchedule.recurringCreate.endLocal);
  96  |     await createDialog.locator('input[name="recurrenceCadence"][value="daily"]').check({ force: true });
  97  |     await createDialog.locator('input[name="repeatCount"]').fill('');
  98  |     await createDialog.locator('input[name="repeatUntil"]').fill('');
  99  |     await createDialog.getByRole('button', { name: 'Save shift' }).click();
  100 | 
  101 |     const createState = page.getByTestId('create-state');
  102 |     await expect(page.locator('[data-testid^="shift-card-"] h3').filter({ hasText: seededSchedule.recurringCreate.title })).toHaveCount(0);
  103 |     if ((await createState.count()) > 0) {
  104 |       await expect(createState).toBeVisible();
  105 |       await expect(createState).toContainText('RECURRENCE_BOUND_REQUIRED');
  106 |     }
  107 | 
  108 |     flow.mark('create-recurring-success', seededSchedule.recurringCreate.title);
  109 |     await createDialog.locator('summary').click();
  110 |     await createDialog.locator('input[name="title"]').fill(seededSchedule.recurringCreate.title);
  111 |     await createDialog.locator('input[name="startAt"]').fill(seededSchedule.recurringCreate.startLocal);
  112 |     await createDialog.locator('input[name="endAt"]').fill(seededSchedule.recurringCreate.endLocal);
  113 |     await createDialog.locator('input[name="recurrenceCadence"][value="daily"]').check({ force: true });
  114 |     await createDialog.locator('input[name="repeatCount"]').fill(seededSchedule.recurringCreate.repeatCount);
  115 |     await createDialog.getByRole('button', { name: 'Save shift' }).click();
  116 | 
  117 |     const actionStrip = page.getByTestId('schedule-action-strip');
  118 |     if ((await actionStrip.count()) > 0) {
  119 |       await expect(actionStrip).toContainText('SHIFT_CREATED');
  120 |     }
  121 | 
  122 |     for (const dayKey of seededSchedule.recurringCreate.expectedDayKeys) {
> 123 |       await expect(dayColumn(page, dayKey)).toContainText(seededSchedule.recurringCreate.title);
      |                                             ^ Error: expect(locator).toContainText(expected) failed
  124 |     }
  125 | 
  126 |     await expect(page.locator('[data-testid^="shift-card-"] h3').filter({ hasText: seededSchedule.recurringCreate.title })).toHaveCount(
  127 |       seededSchedule.recurringCreate.expectedDayKeys.length
  128 |     );
  129 |   });
  130 | 
  131 |   await test.step('phase: edit a seeded shift in place and surface the trusted edit state', async () => {
  132 |     flow.mark('edit-shift', seededSchedule.editExpectation.shiftId);
  133 |     flow.setContext({
  134 |       note: 'editing a seeded one-off shift in place',
  135 |       focusShiftIds: [seededSchedule.editExpectation.shiftId]
  136 |     });
  137 | 
  138 |     const morningCard = shiftCard(page, seededSchedule.editExpectation.shiftId);
  139 |     const editDialog = morningCard.locator('details:has(summary:has-text("Edit details"))');
  140 | 
  141 |     await editDialog.locator('summary').click();
  142 |     await editDialog.locator('input[name="title"]').fill(seededSchedule.editExpectation.nextTitle);
  143 |     await editDialog.locator('input[name="startAt"]').fill(seededSchedule.editExpectation.nextStartLocal);
  144 |     await editDialog.locator('input[name="endAt"]').fill(seededSchedule.editExpectation.nextEndLocal);
  145 |     await editDialog.getByRole('button', { name: 'Save edits' }).click();
  146 | 
  147 |     const actionStrip = page.getByTestId('schedule-action-strip');
  148 |     if ((await actionStrip.count()) > 0) {
  149 |       await expect(actionStrip).toContainText('SHIFT_UPDATED');
  150 |     }
  151 |     await expect(shiftCardInDay(page, '2026-04-15', seededSchedule.editExpectation.shiftId)).toContainText(
  152 |       seededSchedule.editExpectation.nextTitle
  153 |     );
  154 |     await expect(shiftCardInDay(page, '2026-04-15', seededSchedule.editExpectation.shiftId)).toContainText('09:30 → 11:30');
  155 |   });
  156 | 
  157 |   await test.step('phase: move a seeded shift into a new day column', async () => {
  158 |     flow.mark('move-shift', seededSchedule.moveExpectation.shiftId);
  159 |     flow.setContext({
  160 |       note: 'moving a seeded shift from Thursday into Friday',
  161 |       focusShiftIds: [seededSchedule.moveExpectation.shiftId]
  162 |     });
  163 | 
  164 |     const supplierCard = shiftCard(page, seededSchedule.moveExpectation.shiftId);
  165 |     const moveDialog = supplierCard.locator('details:has(summary:has-text("Move timing"))');
  166 | 
  167 |     await moveDialog.locator('summary').click();
  168 |     await moveDialog.locator('input[name="startAt"]').fill(seededSchedule.moveExpectation.nextStartLocal);
  169 |     await moveDialog.locator('input[name="endAt"]').fill(seededSchedule.moveExpectation.nextEndLocal);
  170 |     await moveDialog.getByRole('button', { name: 'Save new timing' }).click();
  171 | 
  172 |     const actionStrip = page.getByTestId('schedule-action-strip');
  173 |     if ((await actionStrip.count()) > 0) {
  174 |       await expect(actionStrip).toContainText('SHIFT_MOVED');
  175 |     }
  176 |     await expect(
  177 |       page.locator(
  178 |         `[data-testid="day-column-${seededSchedule.moveExpectation.fromDayKey}"] [data-testid="shift-card-${seededSchedule.moveExpectation.shiftId}"]`
  179 |       )
  180 |     ).toHaveCount(0);
  181 |     await expect(shiftCardInDay(page, seededSchedule.moveExpectation.toDayKey, seededSchedule.moveExpectation.shiftId)).toContainText(
  182 |       seededSchedule.moveExpectation.title
  183 |     );
  184 |     await expect(shiftCardInDay(page, seededSchedule.moveExpectation.toDayKey, seededSchedule.moveExpectation.shiftId)).toContainText(
  185 |       '15:00 → 17:00'
  186 |     );
  187 |   });
  188 | 
  189 |   await test.step('phase: delete a seeded shift and confirm the card disappears from the board', async () => {
  190 |     flow.mark('delete-shift', seededSchedule.deleteExpectation.shiftId);
  191 |     flow.setContext({
  192 |       note: 'deleting a seeded one-off shift from the visible week',
  193 |       focusShiftIds: [seededSchedule.deleteExpectation.shiftId]
  194 |     });
  195 | 
  196 |     await shiftCard(page, seededSchedule.deleteExpectation.shiftId)
  197 |       .getByRole('button', { name: 'Delete shift' })
  198 |       .click();
  199 | 
  200 |     const actionStrip = page.getByTestId('schedule-action-strip');
  201 |     if ((await actionStrip.count()) > 0) {
  202 |       await expect(actionStrip).toContainText('SHIFT_DELETED');
  203 |     }
  204 |     await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
  205 |     await expect(dayColumn(page, seededSchedule.deleteExpectation.dayKey)).not.toContainText(
  206 |       seededSchedule.deleteExpectation.title
  207 |     );
  208 |   });
  209 | 
  210 |   await test.step('phase: reload and prove the edited, moved, deleted, and recurring states survive a fresh route load', async () => {
  211 |     flow.mark('reload-calendar', seededCalendars.alphaShared);
  212 |     flow.setContext({
  213 |       note: 'reloading after create/edit/move/delete to prove server continuity',
  214 |       focusShiftIds: [seededSchedule.editExpectation.shiftId, seededSchedule.moveExpectation.shiftId]
  215 |     });
  216 | 
  217 |     await page.reload();
  218 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  219 |     await expect(page.getByTestId('calendar-week-board')).toBeVisible();
  220 | 
  221 |     const visibleWeek = await readVisibleWeekFromBoard(page);
  222 |     expect(visibleWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
  223 |     expect(visibleWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
```