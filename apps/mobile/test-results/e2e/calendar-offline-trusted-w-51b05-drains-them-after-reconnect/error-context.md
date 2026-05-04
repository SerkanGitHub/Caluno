# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-offline.spec.ts >> trusted warm-up reopens offline, keeps multiple queued edits across reload, and drains them after reconnect
- Location: tests/e2e/calendar-offline.spec.ts:25:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('calendar-route-state')
Expected: "trusted-online"
Received: "trusted-offline"
Timeout:  10000ms

Call log:
  - Expect "toHaveAttribute" with timeout 10000ms
  - waiting for getByTestId('calendar-route-state')
    14 × locator resolved to <section data-pending-count="0" data-sync-phase="idle" data-queue-state="ready" data-retryable-count="0" data-denied-reason="none" data-failure-phase="none" data-shell-bootstrap="ready" data-create-prefill-end="none" data-board-source="server-sync" data-visible-week-source="query" data-create-prefill-start="none" data-route-mode="trusted-offline" data-last-retryable-reason="none" data-create-prefill-status="none" data-create-prefill-source="none" data-testid="calendar-route-state" data-snapshot-origin=…>…</section>
       - unexpected value "trusted-offline"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Caluno pocket shell
      - generic [ref=e7]:
        - generic [ref=e8]: Bob Member
        - button "Sign out" [ref=e9] [cursor=pointer]
    - generic [ref=e10]:
      - heading "Alpha shared" [level=1] [ref=e11]
      - paragraph [ref=e12]: Previously synced calendars can reopen here offline, keep mobile-local edits visible, and surface exactly when reconnect is pending or retryable.
    - generic [ref=e13]:
      - article [ref=e14]:
        - generic [ref=e15]: Shell state
        - strong [ref=e16]: trusted-ready
      - article [ref=e17]:
        - generic [ref=e18]: Route mode
        - strong [ref=e19]: trusted-online
      - article [ref=e20]:
        - generic [ref=e21]: Snapshot origin
        - strong [ref=e22]: trusted-online
      - article [ref=e23]:
        - generic [ref=e24]: Onboarding
        - strong [ref=e25]: ready
    - paragraph [ref=e26]: "Last trusted refresh: 2026-04-15T07:00:00.000Z"
  - generic [ref=e27]:
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - paragraph [ref=e33]: Calm notifications
            - heading "Alpha shared" [level=3] [ref=e34]
            - paragraph [ref=e35]: This calendar will stay quiet until you enable both reminder and shared-change delivery.
          - generic [ref=e36]:
            - switch "Toggle calm notifications for Alpha shared" [ref=e37] [cursor=pointer]
            - generic [ref=e40]: "Off"
        - generic [ref=e41]:
          - article [ref=e42]:
            - generic [ref=e43]: Permission
            - strong [ref=e44]: granted
          - article [ref=e45]:
            - generic [ref=e46]: Local reminders
            - strong [ref=e47]: ready
          - article [ref=e48]:
            - generic [ref=e49]: Shared changes
            - strong [ref=e50]: unsubscribed
          - article [ref=e51]:
            - generic [ref=e52]: Phase
            - strong [ref=e53]: ready
        - generic [ref=e54]:
          - generic [ref=e55]: "reason: none"
          - generic [ref=e56]: "reminders: 0"
          - generic [ref=e57]: "registration: unknown"
          - generic [ref=e58]: "last sync: 2026-04-15T07:00:00.000Z"
        - paragraph [ref=e59]: Trusted per-device notification preferences loaded successfully.
      - generic [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e62]:
            - paragraph [ref=e63]: Pocket calendar
            - heading "Alpha shared" [level=2] [ref=e64]
            - paragraph [ref=e65]: Apr 13 — Apr 19, 2026
            - paragraph [ref=e66]: Visible week chosen from the route query.
          - generic [ref=e67]:
            - generic [ref=e68]: "Visible week start: 2026-04-13"
            - generic [ref=e69]: 8 shifts
            - generic [ref=e70]: Server-synced board
            - generic [ref=e71]: Offline
            - generic [ref=e72]: Sync idle
            - generic [ref=e73]: No pending local writes
          - generic [ref=e74]:
            - button "New shift" [ref=e75] [cursor=pointer]
            - navigation "Visible week navigation" [ref=e76]:
              - link "Back a week" [ref=e77] [cursor=pointer]:
                - /url: "?start=2026-04-06"
              - link "Forward a week" [ref=e78] [cursor=pointer]:
                - /url: "?start=2026-04-20"
              - link "Find time" [ref=e79] [cursor=pointer]:
                - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-13
        - article [ref=e80]:
          - generic [ref=e81]: Visible-week overlap watch
          - strong [ref=e82]: 1 overlap pair in view
          - paragraph [ref=e83]: Thu, Apr 16 contains 2 conflicting visible shifts.
        - generic [ref=e84]:
          - article [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]:
                - paragraph [ref=e88]: Sync phase
                - heading "idle" [level=3] [ref=e89]
              - generic [ref=e90]: offline
            - paragraph [ref=e91]: No reconnect attempt has been recorded on this calendar yet.
            - generic [ref=e92]:
              - button "Refresh trusted week" [ref=e93] [cursor=pointer]
              - button "Drain queue" [disabled] [ref=e94]
          - article [ref=e95]:
            - generic [ref=e96]:
              - generic [ref=e97]:
                - paragraph [ref=e98]: Queue state
                - heading "Showing trusted server sync" [level=3] [ref=e99]
              - generic [ref=e100]: 0 pending / 0 retryable
            - paragraph [ref=e101]: The visible week is currently in step with the trusted mobile transport.
            - generic [ref=e102]:
              - generic [ref=e103]:
                - term [ref=e104]: Snapshot
                - definition [ref=e105]: server-sync
              - generic [ref=e106]:
                - term [ref=e107]: Queue contract
                - definition [ref=e108]: ready
              - generic [ref=e109]:
                - term [ref=e110]: Writes
                - definition [ref=e111]: editable local-first surface
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e115]:
                - paragraph [ref=e116]: Monday
                - heading "Apr 13" [level=3] [ref=e117]
              - generic [ref=e119]: 1 card
            - article [ref=e121]:
              - generic [ref=e122]:
                - paragraph [ref=e123]: Recurring series
                - generic [ref=e124]: 0.5h block
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - heading "Alpha opening sweep" [level=3] [ref=e127]
                  - paragraph [ref=e128]: 08:30 → 09:00
                - generic [ref=e129]: Occurrence 1
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - term [ref=e132]: Start
                  - definition [ref=e133]: 08:30
                - generic [ref=e134]:
                  - term [ref=e135]: End
                  - definition [ref=e136]: 09:00
                - generic [ref=e137]:
                  - term [ref=e138]: Shift id
                  - definition [ref=e139]:
                    - code [ref=e140]: aaaaaaaa-8888-1111-1111-111111111111
              - generic [ref=e141]:
                - button "Edit" [ref=e142] [cursor=pointer]
                - button "Move" [ref=e143] [cursor=pointer]
                - button "Delete" [ref=e144] [cursor=pointer]
          - generic [ref=e145]:
            - generic [ref=e146]:
              - generic [ref=e147]:
                - paragraph [ref=e148]: Tuesday
                - heading "Apr 14" [level=3] [ref=e149]
              - generic [ref=e151]: 1 card
            - article [ref=e153]:
              - generic [ref=e154]:
                - paragraph [ref=e155]: Recurring series
                - generic [ref=e156]: 0.5h block
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - heading "Alpha opening sweep" [level=3] [ref=e159]
                  - paragraph [ref=e160]: 08:30 → 09:00
                - generic [ref=e161]: Occurrence 2
              - generic [ref=e162]:
                - generic [ref=e163]:
                  - term [ref=e164]: Start
                  - definition [ref=e165]: 08:30
                - generic [ref=e166]:
                  - term [ref=e167]: End
                  - definition [ref=e168]: 09:00
                - generic [ref=e169]:
                  - term [ref=e170]: Shift id
                  - definition [ref=e171]:
                    - code [ref=e172]: aaaaaaaa-8888-1111-1111-222222222222
              - generic [ref=e173]:
                - button "Edit" [ref=e174] [cursor=pointer]
                - button "Move" [ref=e175] [cursor=pointer]
                - button "Delete" [ref=e176] [cursor=pointer]
          - generic [ref=e177]:
            - generic [ref=e178]:
              - generic [ref=e179]:
                - paragraph [ref=e180]: Wednesday
                - heading "Apr 15" [level=3] [ref=e181]
              - generic [ref=e182]:
                - generic [ref=e183]: Today
                - generic [ref=e184]: 3 cards
            - generic [ref=e185]:
              - article [ref=e186]:
                - generic [ref=e187]:
                  - paragraph [ref=e188]: Recurring series
                  - generic [ref=e189]: 0.5h block
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - heading "Alpha opening sweep" [level=3] [ref=e192]
                    - paragraph [ref=e193]: 08:30 → 09:00
                  - generic [ref=e194]: Occurrence 3
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - term [ref=e197]: Start
                    - definition [ref=e198]: 08:30
                  - generic [ref=e199]:
                    - term [ref=e200]: End
                    - definition [ref=e201]: 09:00
                  - generic [ref=e202]:
                    - term [ref=e203]: Shift id
                    - definition [ref=e204]:
                      - code [ref=e205]: aaaaaaaa-8888-1111-1111-333333333333
                - generic [ref=e206]:
                  - button "Edit" [ref=e207] [cursor=pointer]
                  - button "Move" [ref=e208] [cursor=pointer]
                  - button "Delete" [ref=e209] [cursor=pointer]
              - article [ref=e210]:
                - generic [ref=e211]:
                  - paragraph [ref=e212]: One-off shift
                  - generic [ref=e213]: 2h block
                - generic [ref=e215]:
                  - heading "Morning intake" [level=3] [ref=e216]
                  - paragraph [ref=e217]: 09:00 → 11:00
                - generic [ref=e218]:
                  - generic [ref=e219]:
                    - term [ref=e220]: Start
                    - definition [ref=e221]: 09:00
                  - generic [ref=e222]:
                    - term [ref=e223]: End
                    - definition [ref=e224]: 11:00
                  - generic [ref=e225]:
                    - term [ref=e226]: Shift id
                    - definition [ref=e227]:
                      - code [ref=e228]: aaaaaaaa-6666-1111-1111-111111111111
                - generic [ref=e229]:
                  - button "Edit" [ref=e230] [cursor=pointer]
                  - button "Move" [ref=e231] [cursor=pointer]
                  - button "Delete" [ref=e232] [cursor=pointer]
              - article [ref=e233]:
                - generic [ref=e234]:
                  - paragraph [ref=e235]: One-off shift
                  - generic [ref=e236]: 2h block
                - generic [ref=e238]:
                  - heading "Afternoon handoff" [level=3] [ref=e239]
                  - paragraph [ref=e240]: 13:00 → 15:00
                - generic [ref=e241]:
                  - generic [ref=e242]:
                    - term [ref=e243]: Start
                    - definition [ref=e244]: 13:00
                  - generic [ref=e245]:
                    - term [ref=e246]: End
                    - definition [ref=e247]: 15:00
                  - generic [ref=e248]:
                    - term [ref=e249]: Shift id
                    - definition [ref=e250]:
                      - code [ref=e251]: aaaaaaaa-6666-1111-1111-222222222222
                - generic [ref=e252]:
                  - button "Edit" [ref=e253] [cursor=pointer]
                  - button "Move" [ref=e254] [cursor=pointer]
                  - button "Delete" [ref=e255] [cursor=pointer]
          - generic [ref=e256]:
            - generic [ref=e257]:
              - generic [ref=e258]:
                - paragraph [ref=e259]: Thursday
                - heading "Apr 16" [level=3] [ref=e260]
              - generic [ref=e262]: 3 cards
            - article [ref=e263]:
              - strong [ref=e264]: 1 overlap pair
              - paragraph [ref=e265]: Kitchen prep (12:00 → 14:00) · Supplier call (13:00 → 15:00)
            - generic [ref=e266]:
              - article [ref=e267]:
                - generic [ref=e268]:
                  - paragraph [ref=e269]: Recurring series
                  - generic [ref=e270]: 0.5h block
                - generic [ref=e271]:
                  - generic [ref=e272]:
                    - heading "Alpha opening sweep" [level=3] [ref=e273]
                    - paragraph [ref=e274]: 08:30 → 09:00
                  - generic [ref=e275]: Occurrence 4
                - generic [ref=e276]:
                  - generic [ref=e277]:
                    - term [ref=e278]: Start
                    - definition [ref=e279]: 08:30
                  - generic [ref=e280]:
                    - term [ref=e281]: End
                    - definition [ref=e282]: 09:00
                  - generic [ref=e283]:
                    - term [ref=e284]: Shift id
                    - definition [ref=e285]:
                      - code [ref=e286]: aaaaaaaa-8888-1111-1111-444444444444
                - generic [ref=e287]:
                  - button "Edit" [ref=e288] [cursor=pointer]
                  - button "Move" [ref=e289] [cursor=pointer]
                  - button "Delete" [ref=e290] [cursor=pointer]
              - article [ref=e291]:
                - generic [ref=e292]:
                  - paragraph [ref=e293]: One-off shift
                  - generic [ref=e294]: 2h block
                - generic [ref=e296]:
                  - heading "Kitchen prep" [level=3] [ref=e297]
                  - paragraph [ref=e298]: 12:00 → 14:00
                - generic [ref=e300]: Overlaps 1 visible shift
                - generic [ref=e301]:
                  - generic [ref=e302]:
                    - term [ref=e303]: Start
                    - definition [ref=e304]: 12:00
                  - generic [ref=e305]:
                    - term [ref=e306]: End
                    - definition [ref=e307]: 14:00
                  - generic [ref=e308]:
                    - term [ref=e309]: Shift id
                    - definition [ref=e310]:
                      - code [ref=e311]: aaaaaaaa-7777-1111-1111-111111111111
                - article [ref=e312]:
                  - strong [ref=e313]: Overlaps 1 visible shift
                  - paragraph [ref=e314]: Supplier call (13:00 → 15:00)
                - generic [ref=e315]:
                  - button "Edit" [ref=e316] [cursor=pointer]
                  - button "Move" [ref=e317] [cursor=pointer]
                  - button "Delete" [ref=e318] [cursor=pointer]
              - article [ref=e319]:
                - generic [ref=e320]:
                  - paragraph [ref=e321]: One-off shift
                  - generic [ref=e322]: 2h block
                - generic [ref=e324]:
                  - heading "Supplier call" [level=3] [ref=e325]
                  - paragraph [ref=e326]: 13:00 → 15:00
                - generic [ref=e328]: Overlaps 1 visible shift
                - generic [ref=e329]:
                  - generic [ref=e330]:
                    - term [ref=e331]: Start
                    - definition [ref=e332]: 13:00
                  - generic [ref=e333]:
                    - term [ref=e334]: End
                    - definition [ref=e335]: 15:00
                  - generic [ref=e336]:
                    - term [ref=e337]: Shift id
                    - definition [ref=e338]:
                      - code [ref=e339]: aaaaaaaa-7777-1111-1111-222222222222
                - article [ref=e340]:
                  - strong [ref=e341]: Overlaps 1 visible shift
                  - paragraph [ref=e342]: Kitchen prep (12:00 → 14:00)
                - generic [ref=e343]:
                  - button "Edit" [ref=e344] [cursor=pointer]
                  - button "Move" [ref=e345] [cursor=pointer]
                  - button "Delete" [ref=e346] [cursor=pointer]
          - generic [ref=e347]:
            - generic [ref=e348]:
              - generic [ref=e349]:
                - paragraph [ref=e350]: Friday
                - heading "Apr 17" [level=3] [ref=e351]
              - generic [ref=e353]: 0 cards
            - article [ref=e354]:
              - paragraph [ref=e355]: Quiet day
              - heading "No shifts on this day yet." [level=4] [ref=e356]
              - paragraph [ref=e357]: Add a shift from the top action or keep the day clear.
          - generic [ref=e358]:
            - generic [ref=e359]:
              - generic [ref=e360]:
                - paragraph [ref=e361]: Saturday
                - heading "Apr 18" [level=3] [ref=e362]
              - generic [ref=e364]: 0 cards
            - article [ref=e365]:
              - paragraph [ref=e366]: Quiet day
              - heading "No shifts on this day yet." [level=4] [ref=e367]
              - paragraph [ref=e368]: Add a shift from the top action or keep the day clear.
          - generic [ref=e369]:
            - generic [ref=e370]:
              - generic [ref=e371]:
                - paragraph [ref=e372]: Sunday
                - heading "Apr 19" [level=3] [ref=e373]
              - generic [ref=e375]: 0 cards
            - article [ref=e376]:
              - paragraph [ref=e377]: Quiet day
              - heading "No shifts on this day yet." [level=4] [ref=e378]
              - paragraph [ref=e379]: Add a shift from the top action or keep the day clear.
    - generic [ref=e380]:
      - generic [ref=e381]:
        - generic [ref=e382]:
          - paragraph [ref=e383]: Trusted inventory
          - heading "Jump only within already-permitted calendars." [level=3] [ref=e384]
        - generic [ref=e385]: 2 visible
      - generic [ref=e386]:
        - link "Alpha shared Primary calendar" [ref=e387] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?start=2026-04-13
          - strong [ref=e388]: Alpha shared
          - generic [ref=e389]: Primary calendar
        - link "Alpha backlog Secondary calendar" [ref=e390] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222?start=2026-04-13
          - strong [ref=e391]: Alpha backlog
          - generic [ref=e392]: Secondary calendar
  - navigation "Primary mobile navigation" [ref=e393]:
    - link "Groups" [ref=e394] [cursor=pointer]:
      - /url: /groups
    - link "Alpha shared" [ref=e395] [cursor=pointer]:
      - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
    - link "Account" [ref=e396] [cursor=pointer]:
      - /url: /signin
```

# Test source

```ts
  1   | import {
  2   |   buildCalendarPath,
  3   |   buildMutationQueueKey,
  4   |   clearPersistedSession,
  5   |   corruptAppShellContinuity,
  6   |   corruptOfflineMutationQueue,
  7   |   expect,
  8   |   openCalendar,
  9   |   seededCalendars,
  10  |   seededUsers,
  11  |   seededWeekStarts,
  12  |   setSimulatedConnectivity,
  13  |   signInThroughUi,
  14  |   test,
  15  |   waitForPendingCount,
  16  |   waitForRetryableCount
  17  | } from './fixtures';
  18  | 
  19  | const warmWeekStart = seededWeekStarts.alphaWarm;
  20  | const warmCalendarPath = buildCalendarPath(seededCalendars.alphaShared, warmWeekStart);
  21  | const seededEditableShiftId = 'aaaaaaaa-6666-1111-1111-111111111111';
  22  | 
  23  | test.describe.configure({ mode: 'serial' });
  24  | 
  25  | test('trusted warm-up reopens offline, keeps multiple queued edits across reload, and drains them after reconnect', async ({ page }) => {
  26  |   await signInThroughUi(page, seededUsers.alphaMember);
  27  |   await openCalendar(page, {
  28  |     calendarId: seededCalendars.alphaShared,
  29  |     weekStart: warmWeekStart,
  30  |     expectedName: 'Alpha shared'
  31  |   });
  32  | 
  33  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  34  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'query');
  35  |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
  36  |   await waitForPendingCount(page, 0);
  37  |   await waitForRetryableCount(page, 0);
  38  |   await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake');
  39  | 
  40  |   await setSimulatedConnectivity(page, false);
> 41  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
      |                                                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  42  | 
  43  |   await page.getByTestId('create-shift-trigger-create-week').click();
  44  |   await expect(page.getByTestId('create-shift-editor')).toBeVisible();
  45  |   await page.getByTestId('create-title-input').fill('Offline opening backup');
  46  |   await page.getByTestId('create-start-input').fill('2026-04-15T16:00');
  47  |   await page.getByTestId('create-end-input').fill('2026-04-15T18:00');
  48  |   await page.getByTestId('create-shift-editor').locator('form').evaluate((form) => {
  49  |     (form as HTMLFormElement).requestSubmit();
  50  |   });
  51  | 
  52  |   await page.getByTestId(`edit-shift-trigger-edit-${seededEditableShiftId}`).click();
  53  |   await expect(page.getByTestId('edit-shift-editor')).toBeVisible();
  54  |   await page.getByTestId('edit-title-input').fill('Morning intake offline edit');
  55  |   await page.getByTestId('edit-shift-editor').locator('form').evaluate((form) => {
  56  |     (form as HTMLFormElement).requestSubmit();
  57  |   });
  58  | 
  59  |   await waitForPendingCount(page, 2);
  60  |   await waitForRetryableCount(page, 0);
  61  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-board-source', 'cached-local');
  62  |   await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  63  |   await expect(page.locator('[data-local-only="true"]')).toContainText('Offline opening backup');
  64  | 
  65  |   await clearPersistedSession(page);
  66  |   await page.reload();
  67  |   await expect(page).toHaveURL(new RegExp(`${warmCalendarPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  68  |   await expect(page.getByTestId('calendar-shell')).toBeVisible();
  69  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'cached-offline');
  70  |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-route-mode', 'cached-offline');
  71  |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-network', 'offline');
  72  |   await waitForPendingCount(page, 2);
  73  |   await waitForRetryableCount(page, 0);
  74  |   await expect(page.getByTestId('mobile-calendar-readonly')).toBeVisible();
  75  |   await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  76  |   await expect(page.locator('[data-local-only="true"]')).toContainText('Offline opening backup');
  77  | 
  78  |   await setSimulatedConnectivity(page, true, { waitForCalendarUi: false });
  79  |   await signInThroughUi(page, seededUsers.alphaMember);
  80  |   await openCalendar(page, {
  81  |     calendarId: seededCalendars.alphaShared,
  82  |     weekStart: warmWeekStart,
  83  |     expectedName: 'Alpha shared'
  84  |   });
  85  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  86  |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-network', 'online');
  87  | 
  88  |   const drainButton = page.getByTestId('calendar-drain-button');
  89  |   if ((await page.getByTestId('calendar-route-state').getAttribute('data-pending-count')) !== '0' && (await drainButton.isEnabled())) {
  90  |     await drainButton.click();
  91  |   }
  92  | 
  93  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', '0');
  94  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', '0');
  95  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-sync-phase', 'idle');
  96  |   await expect(page.locator('[data-local-only="true"]')).toHaveCount(0);
  97  |   await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  98  |   await expect(page.getByTestId('mobile-calendar-board')).toContainText('Offline opening backup');
  99  | });
  100 | 
  101 | test('offline continuity fails closed for unsynced calendars and corrupt cached shell snapshots', async ({ page }) => {
  102 |   await signInThroughUi(page, seededUsers.alphaMember);
  103 |   await openCalendar(page, {
  104 |     calendarId: seededCalendars.alphaShared,
  105 |     weekStart: warmWeekStart,
  106 |     expectedName: 'Alpha shared'
  107 |   });
  108 | 
  109 |   await clearPersistedSession(page);
  110 |   await setSimulatedConnectivity(page, false);
  111 | 
  112 |   await page.goto(buildCalendarPath(seededCalendars.betaShared, warmWeekStart));
  113 |   await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  114 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-not-synced');
  115 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
  116 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-attempted-calendar-id', seededCalendars.betaShared);
  117 | 
  118 |   await corruptAppShellContinuity(page, 'not-json');
  119 |   await page.goto(warmCalendarPath);
  120 |   await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  121 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'cache-parse-failed');
  122 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
  123 | });
  124 | 
  125 | test('invalid week params and malformed queued payloads stay attributable through explicit diagnostics', async ({ page }) => {
  126 |   await signInThroughUi(page, seededUsers.alphaMember);
  127 |   await openCalendar(page, {
  128 |     calendarId: seededCalendars.alphaShared,
  129 |     weekStart: warmWeekStart,
  130 |     expectedName: 'Alpha shared'
  131 |   });
  132 | 
  133 |   await page.goto(`/calendars/${seededCalendars.alphaShared}?start=not-a-date`);
  134 |   await expect(page.getByTestId('calendar-shell')).toBeVisible();
  135 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'fallback-invalid');
  136 | 
  137 |   await corruptOfflineMutationQueue(page, {
  138 |     userId: seededUsers.alphaMember.id,
  139 |     calendarId: seededCalendars.alphaShared,
  140 |     weekStart: warmWeekStart,
  141 |     raw: '{not-json'
```