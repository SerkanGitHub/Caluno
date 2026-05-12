# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-shifts.spec.ts >> touching-boundary create drafts stay advisory-free before submit
- Location: tests/e2e/calendar-shifts.spec.ts:339:1

# Error details

```
Error: expected the create dialog to stay advisory-free for the Wednesday touch boundary draft

expect(received).toBeNull()

Received: 1

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
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
        - paragraph [ref=e17]: The visible week is rendering from the trusted server snapshot, and offline continuity is cached on this browser.
        - code [ref=e18]: 0 pending / 0 retryable
      - article [ref=e19]:
        - generic [ref=e20]: Sync diagnostics
        - strong [ref=e21]: idle
        - paragraph [ref=e22]: Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
        - code [ref=e23]: 2026-05-12T08:37:14.689Z
      - article [ref=e24]:
        - generic [ref=e25]: Realtime diagnostics
        - strong [ref=e26]: ready
        - paragraph [ref=e27]: Live change detection is connected for this calendar. Realtime signals trigger trusted refreshes instead of direct client writes.
        - code [ref=e28]: No shared shift signal received yet
        - paragraph [ref=e29]: Listening for shared shift changes on this calendar week.
      - article [ref=e30]:
        - generic [ref=e31]: Week scope
        - strong [ref=e32]: 2026-04-13
        - paragraph [ref=e33]: The requested visible week resolved successfully.
        - code [ref=e34]: server-sync
    - navigation [ref=e35]:
      - link "Back to groups" [ref=e36] [cursor=pointer]:
        - /url: /groups
      - link "Sign out" [ref=e37] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e38]:
    - generic [ref=e39]:
      - paragraph [ref=e40]: Alpha Team
      - heading "Alpha shared" [level=2] [ref=e41]
      - paragraph [ref=e42]: "A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation."
      - generic [ref=e43]:
        - link "Browse truthful find-time" [ref=e44] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-13
        - generic [ref=e45]: Server-shaped availability
      - generic [ref=e46]:
        - generic [ref=e47]: Default calendar
        - generic [ref=e48]: member access
        - generic [ref=e49]: 7 visible shifts
        - generic [ref=e50]: Trusted online
        - generic [ref=e51]: idle
        - generic [ref=e52]: realtime ready
    - generic [ref=e53]:
      - generic [ref=e54]:
        - generic [ref=e55]:
          - paragraph [ref=e56]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e57]
          - paragraph [ref=e58]: Visible week chosen from the route query.
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]: "Visible week start: 2026-04-13"
            - generic [ref=e62]: 7 shifts
            - generic [ref=e63]: UTC board
            - generic [ref=e64]: 1 overlap pair in view
            - generic [ref=e65]: Server-synced board
            - generic [ref=e66]: Online
            - generic [ref=e67]: Sync idle
            - generic [ref=e68]: Sync attempt recorded
            - generic [ref=e69]: No pending local writes
          - navigation "Visible week navigation" [ref=e70]:
            - link "Previous week" [ref=e71] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e72] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e73]:
        - group [ref=e74]:
          - generic "Plan a shift" [active] [ref=e75] [cursor=pointer]
          - generic [ref=e76]:
            - generic [ref=e77]:
              - generic [ref=e78]:
                - paragraph [ref=e79]: Local-first create
                - heading "Create a shift" [level=3] [ref=e80]
              - generic [ref=e81]: UTC times
            - generic [ref=e82]:
              - group [ref=e83]:
                - generic [ref=e84]:
                  - generic [ref=e85]: Title
                  - textbox "Title" [ref=e86]:
                    - /placeholder: Opening shift
                    - text: Boundary clear advisory proof
                - generic [ref=e87]:
                  - generic [ref=e88]:
                    - generic [ref=e89]: Start
                    - textbox "Start" [ref=e90]: 2026-04-15T11:00
                  - generic [ref=e91]:
                    - generic [ref=e92]: End
                    - textbox "End" [ref=e93]: 2026-04-15T12:00
                - article [ref=e94]:
                  - generic [ref=e95]:
                    - generic [ref=e96]:
                      - paragraph [ref=e97]: Heads up
                      - strong [ref=e98]: 1 overlapping shift
                    - generic [ref=e99]: Warning only
                  - paragraph [ref=e100]: This draft overlaps another visible-week shift in the same calendar. You can still save it if the overlap is intentional.
                  - list [ref=e101]:
                    - listitem [ref=e102]:
                      - strong [ref=e103]: Morning intake offline revised
                      - generic [ref=e104]: Apr 15 · 09:45–11:45 UTC
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - generic [ref=e107]:
                      - paragraph [ref=e108]: Bounded recurrence
                      - heading "Optional repeat rule" [level=3] [ref=e109]
                    - generic [ref=e110]: Count or until required
                  - generic [ref=e111]:
                    - strong [ref=e112]: One-off shift
                    - paragraph [ref=e113]: Leave this blank for a single shift, or choose a cadence below.
                  - article [ref=e114]:
                    - generic [ref=e115]:
                      - paragraph [ref=e116]: Calm suggestion
                      - strong [ref=e117]: Monday 08:30–09:00
                      - paragraph [ref=e118]: Recent shifts suggest a calm monday 08:30–09:00 rhythm.
                    - generic [ref=e119]:
                      - button "Use weekly suggestion" [ref=e120] [cursor=pointer]
                      - button "Dismiss suggestion" [ref=e121] [cursor=pointer]
                  - generic [ref=e122]:
                    - group [ref=e123]:
                      - generic [ref=e124]: Cadence
                      - generic [ref=e125]:
                        - generic [ref=e126] [cursor=pointer]:
                          - radio "One-off No repeats" [checked] [ref=e127]
                          - strong [ref=e128]: One-off
                          - generic [ref=e129]: No repeats
                        - generic [ref=e130] [cursor=pointer]:
                          - radio "Daily Every day" [ref=e131]
                          - strong [ref=e132]: Daily
                          - generic [ref=e133]: Every day
                        - generic [ref=e134] [cursor=pointer]:
                          - radio "Weekly Weekly cadence" [ref=e135]
                          - strong [ref=e136]: Weekly
                          - generic [ref=e137]: Weekly cadence
                        - generic [ref=e138] [cursor=pointer]:
                          - radio "Monthly Monthly cadence" [ref=e139]
                          - strong [ref=e140]: Monthly
                          - generic [ref=e141]: Monthly cadence
                    - generic [ref=e142]:
                      - generic [ref=e143]: Interval
                      - spinbutton "Interval" [ref=e144]
                    - generic [ref=e145]:
                      - generic [ref=e146]: Repeat count
                      - spinbutton "Repeat count" [ref=e147]
                    - generic [ref=e148]:
                      - generic [ref=e149]: Repeat until
                      - textbox "Repeat until" [ref=e150]
              - generic [ref=e151]:
                - button "Save shift" [ref=e152] [cursor=pointer]
                - generic [ref=e153]: The board updates locally first, then waits for trusted server confirmation when online.
        - generic [ref=e154]:
          - paragraph [ref=e155]: Board rhythm
          - paragraph [ref=e156]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - article [ref=e157]:
        - generic [ref=e158]: Visible-week conflict watch
        - strong [ref=e159]: 1 overlap pair in view
        - paragraph [ref=e160]: Fri, Apr 17 contains 2 conflicting visible shifts.
      - article [ref=e161]:
        - generic [ref=e162]: Board sync diagnostics
        - strong [ref=e163]: Sync idle
        - paragraph [ref=e164]:
          - text: "Last reconnect attempt:"
          - code [ref=e165]: 2026-05-12T08:37:14.689Z
      - article [ref=e166]:
        - generic [ref=e167]: Board realtime diagnostics
        - strong [ref=e168]: ready
        - paragraph [ref=e169]: No shared shift signal has touched this visible week yet.
        - paragraph [ref=e170]: Listening for shared shift changes on this calendar week.
      - generic [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]:
            - generic [ref=e174]:
              - paragraph [ref=e175]: Monday
              - heading "Apr 13" [level=3] [ref=e176]
            - generic [ref=e178]: 1 shift
          - article [ref=e180]:
            - generic [ref=e181]:
              - generic [ref=e182]:
                - paragraph [ref=e183]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e184]
              - generic [ref=e185]:
                - generic [ref=e186]: 08:30 → 09:00
                - generic [ref=e187]: Occurrence 4
            - generic [ref=e188]:
              - generic [ref=e189]:
                - text: Window
                - strong [ref=e190]: 08:30 → 09:00
              - generic [ref=e191]:
                - text: Duration
                - strong [ref=e192]: 0.5h block
              - generic [ref=e193]:
                - text: Shift id
                - code [ref=e194]: aaaaaaaa-8888-1111-1111-666666666666
            - generic [ref=e195]:
              - group [ref=e196]:
                - generic "Edit details" [ref=e197] [cursor=pointer]
              - group [ref=e198]:
                - generic "Move timing" [ref=e199] [cursor=pointer]
              - button "Delete shift" [ref=e201] [cursor=pointer]
        - generic [ref=e202]:
          - generic [ref=e203]:
            - generic [ref=e204]:
              - paragraph [ref=e205]: Tuesday
              - heading "Apr 14" [level=3] [ref=e206]
            - generic [ref=e208]: 0 shifts
          - article [ref=e209]:
            - paragraph [ref=e210]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e211]
            - paragraph [ref=e212]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e213]:
          - generic [ref=e214]:
            - generic [ref=e215]:
              - paragraph [ref=e216]: Wednesday
              - heading "Apr 15" [level=3] [ref=e217]
            - generic [ref=e219]: 2 shifts
          - generic [ref=e220]:
            - article [ref=e221]:
              - generic [ref=e222]:
                - generic [ref=e223]:
                  - paragraph [ref=e224]: One-off shift
                  - heading "Alpha opening sweep" [level=3] [ref=e225]
                - generic [ref=e227]: 08:30 → 09:00
              - generic [ref=e228]:
                - generic [ref=e229]:
                  - text: Window
                  - strong [ref=e230]: 08:30 → 09:00
                - generic [ref=e231]:
                  - text: Duration
                  - strong [ref=e232]: 0.5h block
                - generic [ref=e233]:
                  - text: Shift id
                  - code [ref=e234]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e235]:
                - group [ref=e236]:
                  - generic "Edit details" [ref=e237] [cursor=pointer]
                - group [ref=e238]:
                  - generic "Move timing" [ref=e239] [cursor=pointer]
                - button "Delete shift" [ref=e241] [cursor=pointer]
            - article [ref=e242]:
              - generic [ref=e243]:
                - generic [ref=e244]:
                  - paragraph [ref=e245]: One-off shift
                  - heading "Morning intake offline revised" [level=3] [ref=e246]
                - generic [ref=e248]: 09:45 → 11:45
              - generic [ref=e249]:
                - generic [ref=e250]:
                  - text: Window
                  - strong [ref=e251]: 09:45 → 11:45
                - generic [ref=e252]:
                  - text: Duration
                  - strong [ref=e253]: 2h block
                - generic [ref=e254]:
                  - text: Shift id
                  - code [ref=e255]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e256]:
                - group [ref=e257]:
                  - generic "Edit details" [ref=e258] [cursor=pointer]
                - group [ref=e259]:
                  - generic "Move timing" [ref=e260] [cursor=pointer]
                - button "Delete shift" [ref=e262] [cursor=pointer]
        - generic [ref=e263]:
          - generic [ref=e264]:
            - generic [ref=e265]:
              - paragraph [ref=e266]: Thursday
              - heading "Apr 16" [level=3] [ref=e267]
            - generic [ref=e269]: 2 shifts
          - generic [ref=e270]:
            - article [ref=e271]:
              - generic [ref=e272]:
                - generic [ref=e273]:
                  - paragraph [ref=e274]: One-off shift
                  - heading "Alpha opening sweep" [level=3] [ref=e275]
                - generic [ref=e277]: 08:30 → 09:00
              - generic [ref=e278]:
                - generic [ref=e279]:
                  - text: Window
                  - strong [ref=e280]: 08:30 → 09:00
                - generic [ref=e281]:
                  - text: Duration
                  - strong [ref=e282]: 0.5h block
                - generic [ref=e283]:
                  - text: Shift id
                  - code [ref=e284]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e285]:
                - group [ref=e286]:
                  - generic "Edit details" [ref=e287] [cursor=pointer]
                - group [ref=e288]:
                  - generic "Move timing" [ref=e289] [cursor=pointer]
                - button "Delete shift" [ref=e291] [cursor=pointer]
            - article [ref=e292]:
              - generic [ref=e293]:
                - generic [ref=e294]:
                  - paragraph [ref=e295]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e296]
                - generic [ref=e298]: 12:00 → 14:00
              - generic [ref=e299]:
                - generic [ref=e300]:
                  - text: Window
                  - strong [ref=e301]: 12:00 → 14:00
                - generic [ref=e302]:
                  - text: Duration
                  - strong [ref=e303]: 2h block
                - generic [ref=e304]:
                  - text: Shift id
                  - code [ref=e305]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e306]:
                - group [ref=e307]:
                  - generic "Edit details" [ref=e308] [cursor=pointer]
                - group [ref=e309]:
                  - generic "Move timing" [ref=e310] [cursor=pointer]
                - button "Delete shift" [ref=e312] [cursor=pointer]
        - generic [ref=e313]:
          - generic [ref=e314]:
            - generic:
              - paragraph: Friday
              - heading "Apr 17" [level=3]
            - generic [ref=e315]:
              - generic [ref=e316]: 1 overlap pair
              - generic [ref=e317]: 2 shifts
          - generic [ref=e318]:
            - article [ref=e319]:
              - strong [ref=e320]: 1 overlap pair
              - paragraph [ref=e321]: Offline continuity overlap anchor (16:00 → 17:00) · Supplier call (16:00 → 18:00)
            - article [ref=e322]:
              - generic [ref=e323]:
                - generic [ref=e324]:
                  - paragraph [ref=e325]: One-off shift
                  - heading "Offline continuity overlap anchor" [level=3] [ref=e326]
                - generic [ref=e327]:
                  - generic [ref=e328]: 16:00 → 17:00
                  - generic [ref=e329]: Overlaps 1 visible shift
              - article [ref=e330]:
                - strong [ref=e331]: Overlaps 1 visible shift
                - paragraph [ref=e332]: Supplier call (16:00 → 18:00)
              - generic [ref=e333]:
                - generic [ref=e334]:
                  - text: Window
                  - strong [ref=e335]: 16:00 → 17:00
                - generic [ref=e336]:
                  - text: Duration
                  - strong [ref=e337]: 1h block
                - generic [ref=e338]:
                  - text: Shift id
                  - code [ref=e339]: 8e7aaf17-bbb3-4568-b5be-936b30ee0c90
              - generic [ref=e340]:
                - group [ref=e341]:
                  - generic "Edit details" [ref=e342] [cursor=pointer]
                - group [ref=e343]:
                  - generic "Move timing" [ref=e344] [cursor=pointer]
                - button "Delete shift" [ref=e346] [cursor=pointer]
            - article [ref=e347]:
              - generic [ref=e348]:
                - generic [ref=e349]:
                  - paragraph [ref=e350]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e351]
                - generic [ref=e352]:
                  - generic [ref=e353]: 16:00 → 18:00
                  - generic [ref=e354]: Overlaps 1 visible shift
              - article [ref=e355]:
                - strong [ref=e356]: Overlaps 1 visible shift
                - paragraph [ref=e357]: Offline continuity overlap anchor (16:00 → 17:00)
              - generic [ref=e358]:
                - generic [ref=e359]:
                  - text: Window
                  - strong [ref=e360]: 16:00 → 18:00
                - generic [ref=e361]:
                  - text: Duration
                  - strong [ref=e362]: 2h block
                - generic [ref=e363]:
                  - text: Shift id
                  - code [ref=e364]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e365]:
                - group [ref=e366]:
                  - generic "Edit details" [ref=e367] [cursor=pointer]
                - group [ref=e368]:
                  - generic "Move timing" [ref=e369] [cursor=pointer]
                - button "Delete shift" [ref=e371] [cursor=pointer]
        - generic [ref=e372]:
          - generic [ref=e373]:
            - generic [ref=e374]:
              - paragraph [ref=e375]: Saturday
              - heading "Apr 18" [level=3] [ref=e376]
            - generic [ref=e378]: 0 shifts
          - article [ref=e379]:
            - paragraph [ref=e380]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e381]
            - paragraph [ref=e382]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e383]:
          - generic [ref=e384]:
            - generic [ref=e385]:
              - paragraph [ref=e386]: Sunday
              - heading "Apr 19" [level=3] [ref=e387]
            - generic [ref=e389]: 0 shifts
          - article [ref=e390]:
            - paragraph [ref=e391]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e392]
            - paragraph [ref=e393]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e394]:
      - generic [ref=e395]:
        - generic [ref=e396]:
          - paragraph [ref=e397]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e398]
        - generic [ref=e399]: 2 visible
      - generic [ref=e400]:
        - link "Alpha shared Default calendar" [ref=e401] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e402]: Alpha shared
          - generic [ref=e403]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e404] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e405]: Alpha backlog
          - generic [ref=e406]: Secondary calendar
```

# Test source

```ts
  281 | 
  282 |     await expect(form.getByRole('button', { name: 'Save shift' })).toBeEnabled();
  283 |     await syncCalendarFlowContext(page, flow, {
  284 |       focusShiftIds: overlapBaselineShiftIds,
  285 |       note: 'create draft showed the pre-submit clash advisory for the seeded Thursday overlap while save remained enabled'
  286 |     });
  287 |   });
  288 | 
  289 |   await test.step('phase: submit the warned draft and confirm the overlapping shift still saves', async () => {
  290 |     const editor = page.getByTestId('create-shift-editor');
  291 |     const form = editor.locator('form');
  292 |     await form.getByRole('button', { name: 'Save shift' }).click();
  293 | 
  294 |     await expect(dayColumn(page, overlapDayKey)).toContainText(createdTitle);
  295 |     const savedCard = await resolveVisibleShiftCardIdentity({
  296 |       page,
  297 |       title: createdTitle,
  298 |       dayKey: overlapDayKey,
  299 |       windowLabel: '13:30 → 14:30'
  300 |     });
  301 |     savedShiftId = savedCard.shiftId;
  302 |     await expect(savedCard.locator).toBeVisible();
  303 |     await expect(editor).not.toHaveAttribute('open', '');
  304 |   });
  305 | 
  306 |   await test.step('phase: delete the proof shift so later serial scenarios return to the seeded week state', async () => {
  307 |     if (!savedShiftId) {
  308 |       throw new Error('Expected the saved proof shift id before cleanup.');
  309 |     }
  310 | 
  311 |     await cleanupProofShifts(page, [createdTitle]);
  312 | 
  313 |     for (const shiftId of synthesizedBaselineShiftIds) {
  314 |       const shiftCard = page.getByTestId(`shift-card-${shiftId}`);
  315 |       if ((await shiftCard.count()) === 0) {
  316 |         continue;
  317 |       }
  318 | 
  319 |       await expect(shiftCard).toBeVisible();
  320 |       await shiftCard.getByRole('button', { name: 'Delete shift' }).click();
  321 |       await expect
  322 |         .poll(async () => page.getByTestId(`shift-card-${shiftId}`).count(), {
  323 |           timeout: 20_000,
  324 |           message: `expected synthesized baseline shift ${shiftId} to disappear after cleanup`
  325 |         })
  326 |         .toBe(0);
  327 |     }
  328 | 
  329 |     await page.reload();
  330 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  331 |     await expect(page.getByTestId(`shift-card-${savedShiftId}`)).toHaveCount(0);
  332 | 
  333 |     for (const shiftId of synthesizedBaselineShiftIds) {
  334 |       await expect(page.getByTestId(`shift-card-${shiftId}`)).toHaveCount(0);
  335 |     }
  336 |   });
  337 | });
  338 | 
  339 | test('touching-boundary create drafts stay advisory-free before submit', async ({ page, flow }) => {
  340 |   const clearTitle = 'Boundary clear advisory proof';
  341 |   const clearStartLocal = '2026-04-15T11:00';
  342 |   const clearEndLocal = '2026-04-15T12:00';
  343 | 
  344 |   await test.step('phase: sign in and open the seeded Alpha week', async () => {
  345 |     flow.mark('login', seededUsers.alphaMember.email);
  346 |     await signInThroughUi(page, seededUsers.alphaMember);
  347 | 
  348 |     await openCalendarWeek({
  349 |       page,
  350 |       flow,
  351 |       calendarId: seededCalendars.alphaShared,
  352 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  353 |       focusShiftIds: [seededSchedule.shifts.morningIntake.id, seededSchedule.shifts.afternoonHandoff.id],
  354 |       phase: 'clear-advisory-create'
  355 |     });
  356 | 
  357 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  358 |     await expect(page.getByTestId('schedule-load-state')).toHaveCount(0);
  359 |     await cleanupProofShifts(page);
  360 |   });
  361 | 
  362 |   await test.step('phase: enter a touching Wednesday boundary window and prove the advisory stays absent before submit', async () => {
  363 |     flow.mark('draft-clear-window', `${clearStartLocal} → ${clearEndLocal}`);
  364 |     const editor = await openCreateShiftEditor(page);
  365 |     const form = editor.locator('form');
  366 | 
  367 |     await expect(form.locator('input[name="title"]')).toHaveValue('');
  368 |     await expect(form.locator('input[name="startAt"]')).toHaveValue('2026-04-13T09:00');
  369 |     await expect(form.locator('input[name="endAt"]')).toHaveValue('2026-04-13T13:00');
  370 | 
  371 |     await setShiftEditorDraft(editor, {
  372 |       title: clearTitle,
  373 |       startAt: clearStartLocal,
  374 |       endAt: clearEndLocal
  375 |     });
  376 | 
  377 |     await expect(form.locator('input[name="title"]')).toHaveValue(clearTitle);
  378 |     await expect(form.locator('input[name="startAt"]')).toHaveValue(clearStartLocal);
  379 |     await expect(form.locator('input[name="endAt"]')).toHaveValue(clearEndLocal);
  380 | 
> 381 |     await expect
      |     ^ Error: expected the create dialog to stay advisory-free for the Wednesday touch boundary draft
  382 |       .poll(async () => (await readCreateShiftClashAdvisory(page)).overlapCount, {
  383 |         message: 'expected the create dialog to stay advisory-free for the Wednesday touch boundary draft'
  384 |       })
  385 |       .toBeNull();
  386 | 
  387 |     const advisory = await readCreateShiftClashAdvisory(page);
  388 |     expect(advisory.visible).toBe(false);
  389 |     expect(advisory.overlapCount).toBeNull();
  390 |     expect(advisory.conflictingShiftIds).toEqual([]);
  391 |     expect(advisory.label).toBeNull();
  392 |     expect(advisory.detail).toBeNull();
  393 |     expect(advisory.items).toEqual([]);
  394 |     expect(advisory.text).toBeNull();
  395 | 
  396 |     await expect(form.getByRole('button', { name: 'Save shift' })).toBeEnabled();
  397 |     await syncCalendarFlowContext(page, flow, {
  398 |       focusShiftIds: [seededSchedule.shifts.morningIntake.id, seededSchedule.shifts.afternoonHandoff.id],
  399 |       note: 'create draft stayed advisory-free for the Wednesday touch boundary before submit'
  400 |     });
  401 |   });
  402 | });
  403 | 
  404 | test('browse suggestion handoff creates a visible shift on the intended day and does not reopen after reload', async ({ page, flow }) => {
  405 |   const createdTitle = 'Find time browse handoff';
  406 | 
  407 |   await test.step('phase: sign in, clear any prior proof rows, and open the truthful find-time route for the permitted Alpha calendar', async () => {
  408 |     flow.mark('login', seededUsers.alphaMember.email);
  409 |     await signInThroughUi(page, seededUsers.alphaMember);
  410 | 
  411 |     await openCalendarWeek({
  412 |       page,
  413 |       flow,
  414 |       calendarId: seededCalendars.alphaShared,
  415 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  416 |       phase: 'find-time-browse-cleanup'
  417 |     });
  418 |     await cleanupProofShifts(page, [createdTitle]);
  419 | 
  420 |     await openFindTimeRoute({
  421 |       page,
  422 |       flow,
  423 |       calendarId: seededCalendars.alphaShared,
  424 |       durationMinutes: seededFindTime.durationMinutes,
  425 |       start: seededFindTime.start,
  426 |       phase: 'find-time-browse-create'
  427 |     });
  428 | 
  429 |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  430 |     await expect(page.getByTestId('find-time-browse-window-2-cta')).toBeVisible();
  431 |   });
  432 | 
  433 |   let browseSuggestion: Awaited<ReturnType<typeof readFindTimeBrowseWindowCtaSnapshot>> | null = null;
  434 | 
  435 |   await test.step('phase: click the real browse suggestion CTA and verify the board lands on its exact prefill window', async () => {
  436 |     browseSuggestion = await readFindTimeBrowseWindowCtaSnapshot(page, 2);
  437 |     const expectedPrefillValues = expectedCreateShiftPrefillValues(browseSuggestion);
  438 | 
  439 |     flow.mark('click-browse-suggestion', browseSuggestion.href ?? 'missing-href');
  440 |     await page.getByTestId('find-time-browse-window-2-cta').click();
  441 | 
  442 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  443 | 
  444 |     const visibleWeek = await readVisibleWeekFromBoard(page);
  445 |     expect(visibleWeek.visibleWeekStart).toBe(browseSuggestion.targetWeekStart);
  446 | 
  447 |     const prefill = await readCreateShiftPrefillSnapshot(page);
  448 |     expect(prefill.open).toBe(true);
  449 |     expect(prefill.openOnArrival).toBe('true');
  450 |     expect(prefill.createSource).toBe('find-time');
  451 |     expect(prefill.prefillSource).toBe('find-time');
  452 |     expect(prefill.prefillStart).toBe(browseSuggestion.startAt);
  453 |     expect(prefill.prefillEnd).toBe(browseSuggestion.endAt);
  454 |     expect(prefill.startValue).toBe(expectedPrefillValues.startValue);
  455 |     expect(prefill.endValue).toBe(expectedPrefillValues.endValue);
  456 | 
  457 |     await expect
  458 |       .poll(() => page.url(), {
  459 |         message: 'expected the calendar destination URL to stay clean after the browse suggestion handoff'
  460 |       })
  461 |       .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${browseSuggestion.targetWeekStart}`);
  462 |   });
  463 | 
  464 |   await test.step('phase: submit the existing create dialog and verify the new shift is visible on the chosen board day', async () => {
  465 |     if (!browseSuggestion) {
  466 |       throw new Error('Expected the browse suggestion handoff snapshot before submitting the create dialog.');
  467 |     }
  468 | 
  469 |     const editor = page.getByTestId('create-shift-editor');
  470 |     await submitShiftEditorForm(editor, { title: createdTitle });
  471 | 
  472 |     const targetDayKey = (browseSuggestion.startAt ?? '').slice(0, 10);
  473 |     const targetDayColumn = page.getByTestId(`day-column-${targetDayKey}`);
  474 | 
  475 |     await expect(targetDayColumn).toContainText(createdTitle);
  476 |     await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();
  477 |   });
  478 | 
  479 |   await test.step('phase: reload the board and prove the created shift remains visible without reopening the handoff', async () => {
  480 |     if (!browseSuggestion) {
  481 |       throw new Error('Expected the browse suggestion handoff snapshot before verifying reload behavior.');
```