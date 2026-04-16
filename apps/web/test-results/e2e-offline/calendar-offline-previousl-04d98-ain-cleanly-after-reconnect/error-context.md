# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-offline.spec.ts >> previously synced calendar weeks reopen offline, keep local writes across reload, deny unsynced ids fail closed, and drain cleanly after reconnect
- Location: tests/e2e/calendar-offline.spec.ts:85:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('calendar-local-state')
Expected substring: "online"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for getByTestId('calendar-local-state')

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
        - generic [ref=e15]: Week scope
        - strong [ref=e16]: 2026-04-13
        - paragraph [ref=e17]: The requested visible week resolved successfully.
        - code [ref=e18]: server-sync
    - navigation [ref=e19]:
      - link "Back to groups" [ref=e20] [cursor=pointer]:
        - /url: /groups
      - link "Sign out" [ref=e21] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e22]:
    - generic [ref=e23]:
      - paragraph [ref=e24]: Alpha Team
      - heading "Alpha shared" [level=2] [ref=e25]
      - paragraph [ref=e26]: "A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation."
      - generic [ref=e27]:
        - generic [ref=e28]: Default calendar
        - generic [ref=e29]: member access
        - generic [ref=e30]: 8 visible shifts
        - generic [ref=e31]: Trusted online
        - generic [ref=e32]: idle
        - generic [ref=e33]: realtime closed
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]:
          - paragraph [ref=e37]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e38]
          - paragraph [ref=e39]: Visible week chosen from the route query.
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]: "Visible week start: 2026-04-13"
            - generic [ref=e43]: 8 shifts
            - generic [ref=e44]: UTC board
          - navigation "Visible week navigation" [ref=e45]:
            - link "Previous week" [ref=e46] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e47] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e48]:
        - group [ref=e49]:
          - generic "Plan a shift" [ref=e50] [cursor=pointer]
        - generic [ref=e51]:
          - paragraph [ref=e52]: Board rhythm
          - paragraph [ref=e53]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - article [ref=e54]:
        - generic [ref=e55]: Board sync diagnostics
        - strong [ref=e56]: Sync idle
        - paragraph [ref=e57]: No reconnect attempt has been recorded on this route yet.
      - article [ref=e58]:
        - generic [ref=e59]: Board realtime diagnostics
        - strong [ref=e60]: closed
        - paragraph [ref=e61]: No shared shift signal has touched this visible week yet.
        - paragraph [ref=e62]: Live change detection is idle until a trusted online calendar week is open.
      - generic [ref=e63]:
        - generic [ref=e64]:
          - generic [ref=e65]:
            - generic [ref=e66]:
              - paragraph [ref=e67]: Monday
              - heading "Apr 13" [level=3] [ref=e68]
            - generic [ref=e70]: 1 shift
          - article [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - paragraph [ref=e75]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e76]
              - generic [ref=e77]:
                - generic [ref=e78]: 08:30 → 09:00
                - generic [ref=e79]: Occurrence 1
            - generic [ref=e80]:
              - generic [ref=e81]:
                - text: Window
                - strong [ref=e82]: 08:30 → 09:00
              - generic [ref=e83]:
                - text: Duration
                - strong [ref=e84]: 0.5h block
              - generic [ref=e85]:
                - text: Shift id
                - code [ref=e86]: aaaaaaaa-8888-1111-1111-111111111111
            - generic [ref=e87]:
              - group [ref=e88]:
                - generic "Edit details" [ref=e89] [cursor=pointer]
              - group [ref=e90]:
                - generic "Move timing" [ref=e91] [cursor=pointer]
              - button "Delete shift" [ref=e93] [cursor=pointer]
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]:
              - paragraph [ref=e97]: Tuesday
              - heading "Apr 14" [level=3] [ref=e98]
            - generic [ref=e100]: 1 shift
          - article [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]:
                - paragraph [ref=e105]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e106]
              - generic [ref=e107]:
                - generic [ref=e108]: 08:30 → 09:00
                - generic [ref=e109]: Occurrence 2
            - generic [ref=e110]:
              - generic [ref=e111]:
                - text: Window
                - strong [ref=e112]: 08:30 → 09:00
              - generic [ref=e113]:
                - text: Duration
                - strong [ref=e114]: 0.5h block
              - generic [ref=e115]:
                - text: Shift id
                - code [ref=e116]: aaaaaaaa-8888-1111-1111-222222222222
            - generic [ref=e117]:
              - group [ref=e118]:
                - generic "Edit details" [ref=e119] [cursor=pointer]
              - group [ref=e120]:
                - generic "Move timing" [ref=e121] [cursor=pointer]
              - button "Delete shift" [ref=e123] [cursor=pointer]
        - generic [ref=e124]:
          - generic [ref=e125]:
            - generic [ref=e126]:
              - paragraph [ref=e127]: Wednesday
              - heading "Apr 15" [level=3] [ref=e128]
            - generic [ref=e130]: 3 shifts
          - generic [ref=e131]:
            - article [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - paragraph [ref=e135]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e136]
                - generic [ref=e137]:
                  - generic [ref=e138]: 08:30 → 09:00
                  - generic [ref=e139]: Occurrence 3
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - text: Window
                  - strong [ref=e142]: 08:30 → 09:00
                - generic [ref=e143]:
                  - text: Duration
                  - strong [ref=e144]: 0.5h block
                - generic [ref=e145]:
                  - text: Shift id
                  - code [ref=e146]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e147]:
                - group [ref=e148]:
                  - generic "Edit details" [ref=e149] [cursor=pointer]
                - group [ref=e150]:
                  - generic "Move timing" [ref=e151] [cursor=pointer]
                - button "Delete shift" [ref=e153] [cursor=pointer]
            - article [ref=e154]:
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - paragraph [ref=e157]: One-off shift
                  - heading "Morning intake" [level=3] [ref=e158]
                - generic [ref=e160]: 09:00 → 11:00
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - text: Window
                  - strong [ref=e163]: 09:00 → 11:00
                - generic [ref=e164]:
                  - text: Duration
                  - strong [ref=e165]: 2h block
                - generic [ref=e166]:
                  - text: Shift id
                  - code [ref=e167]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e168]:
                - group [ref=e169]:
                  - generic "Edit details" [ref=e170] [cursor=pointer]
                - group [ref=e171]:
                  - generic "Move timing" [ref=e172] [cursor=pointer]
                - button "Delete shift" [ref=e174] [cursor=pointer]
            - article [ref=e175]:
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - paragraph [ref=e178]: One-off shift
                  - heading "Afternoon handoff" [level=3] [ref=e179]
                - generic [ref=e181]: 13:00 → 15:00
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - text: Window
                  - strong [ref=e184]: 13:00 → 15:00
                - generic [ref=e185]:
                  - text: Duration
                  - strong [ref=e186]: 2h block
                - generic [ref=e187]:
                  - text: Shift id
                  - code [ref=e188]: aaaaaaaa-6666-1111-1111-222222222222
              - generic [ref=e189]:
                - group [ref=e190]:
                  - generic "Edit details" [ref=e191] [cursor=pointer]
                - group [ref=e192]:
                  - generic "Move timing" [ref=e193] [cursor=pointer]
                - button "Delete shift" [ref=e195] [cursor=pointer]
        - generic [ref=e196]:
          - generic [ref=e197]:
            - generic:
              - paragraph: Thursday
              - heading "Apr 16" [level=3]
            - generic [ref=e198]:
              - generic [ref=e199]: Today
              - generic [ref=e200]: 3 shifts
          - generic [ref=e201]:
            - article [ref=e202]:
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - paragraph [ref=e205]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e206]
                - generic [ref=e207]:
                  - generic [ref=e208]: 08:30 → 09:00
                  - generic [ref=e209]: Occurrence 4
              - generic [ref=e210]:
                - generic [ref=e211]:
                  - text: Window
                  - strong [ref=e212]: 08:30 → 09:00
                - generic [ref=e213]:
                  - text: Duration
                  - strong [ref=e214]: 0.5h block
                - generic [ref=e215]:
                  - text: Shift id
                  - code [ref=e216]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e217]:
                - group [ref=e218]:
                  - generic "Edit details" [ref=e219] [cursor=pointer]
                - group [ref=e220]:
                  - generic "Move timing" [ref=e221] [cursor=pointer]
                - button "Delete shift" [ref=e223] [cursor=pointer]
            - article [ref=e224]:
              - generic [ref=e225]:
                - generic [ref=e226]:
                  - paragraph [ref=e227]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e228]
                - generic [ref=e230]: 12:00 → 14:00
              - generic [ref=e231]:
                - generic [ref=e232]:
                  - text: Window
                  - strong [ref=e233]: 12:00 → 14:00
                - generic [ref=e234]:
                  - text: Duration
                  - strong [ref=e235]: 2h block
                - generic [ref=e236]:
                  - text: Shift id
                  - code [ref=e237]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e238]:
                - group [ref=e239]:
                  - generic "Edit details" [ref=e240] [cursor=pointer]
                - group [ref=e241]:
                  - generic "Move timing" [ref=e242] [cursor=pointer]
                - button "Delete shift" [ref=e244] [cursor=pointer]
            - article [ref=e245]:
              - generic [ref=e246]:
                - generic [ref=e247]:
                  - paragraph [ref=e248]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e249]
                - generic [ref=e251]: 13:00 → 15:00
              - generic [ref=e252]:
                - generic [ref=e253]:
                  - text: Window
                  - strong [ref=e254]: 13:00 → 15:00
                - generic [ref=e255]:
                  - text: Duration
                  - strong [ref=e256]: 2h block
                - generic [ref=e257]:
                  - text: Shift id
                  - code [ref=e258]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e259]:
                - group [ref=e260]:
                  - generic "Edit details" [ref=e261] [cursor=pointer]
                - group [ref=e262]:
                  - generic "Move timing" [ref=e263] [cursor=pointer]
                - button "Delete shift" [ref=e265] [cursor=pointer]
        - generic [ref=e266]:
          - generic [ref=e267]:
            - generic [ref=e268]:
              - paragraph [ref=e269]: Friday
              - heading "Apr 17" [level=3] [ref=e270]
            - generic [ref=e272]: 0 shifts
          - article [ref=e273]:
            - paragraph [ref=e274]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e275]
            - paragraph [ref=e276]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e277]:
          - generic [ref=e278]:
            - generic [ref=e279]:
              - paragraph [ref=e280]: Saturday
              - heading "Apr 18" [level=3] [ref=e281]
            - generic [ref=e283]: 0 shifts
          - article [ref=e284]:
            - paragraph [ref=e285]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e286]
            - paragraph [ref=e287]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e288]:
          - generic [ref=e289]:
            - generic [ref=e290]:
              - paragraph [ref=e291]: Sunday
              - heading "Apr 19" [level=3] [ref=e292]
            - generic [ref=e294]: 0 shifts
          - article [ref=e295]:
            - paragraph [ref=e296]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e297]
            - paragraph [ref=e298]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e299]:
      - generic [ref=e300]:
        - generic [ref=e301]:
          - paragraph [ref=e302]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e303]
        - generic [ref=e304]: 2 visible
      - generic [ref=e305]:
        - link "Alpha shared Default calendar" [ref=e306] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e307]: Alpha shared
          - generic [ref=e308]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e309] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e310]: Alpha backlog
          - generic [ref=e311]: Secondary calendar
```

# Test source

```ts
  17  | } from './fixtures';
  18  | 
  19  | test.describe.configure({ mode: 'serial' });
  20  | 
  21  | const offlineCreate = {
  22  |   title: 'Offline continuity rehearsal',
  23  |   dayKey: '2026-04-18',
  24  |   startLocal: '2026-04-18T16:00',
  25  |   endLocal: '2026-04-18T17:00'
  26  | } as const;
  27  | 
  28  | const offlineEdit = {
  29  |   shiftId: seededSchedule.shifts.morningIntake.id,
  30  |   nextTitle: 'Morning intake offline revised',
  31  |   nextStartLocal: '2026-04-15T09:45',
  32  |   nextEndLocal: '2026-04-15T11:45'
  33  | } as const;
  34  | 
  35  | const offlineMove = {
  36  |   shiftId: seededSchedule.shifts.supplierCall.id,
  37  |   title: seededSchedule.shifts.supplierCall.title,
  38  |   fromDayKey: seededSchedule.shifts.supplierCall.dayKey,
  39  |   toDayKey: '2026-04-17',
  40  |   nextStartLocal: '2026-04-17T16:00',
  41  |   nextEndLocal: '2026-04-17T18:00'
  42  | } as const;
  43  | 
  44  | function dayColumn(page: Page, dayKey: string) {
  45  |   return page.getByTestId(`day-column-${dayKey}`);
  46  | }
  47  | 
  48  | function shiftCard(page: Page, shiftId: string) {
  49  |   return page.getByTestId(`shift-card-${shiftId}`);
  50  | }
  51  | 
  52  | function shiftCardInDay(page: Page, dayKey: string, shiftId: string) {
  53  |   return dayColumn(page, dayKey).getByTestId(`shift-card-${shiftId}`);
  54  | }
  55  | 
  56  | function shiftCardByTitle(page: Page, title: string) {
  57  |   return page.locator('[data-testid^="shift-card-"]').filter({ hasText: title }).first();
  58  | }
  59  | 
  60  | test('preview proof surface exposes isolation headers and a live service worker before offline continuity begins', async ({
  61  |   page,
  62  |   flow
  63  | }) => {
  64  |   await test.step('phase: open the signed-out preview surface and verify the isolation headers', async () => {
  65  |     flow.mark('preview-shell', '/signin');
  66  | 
  67  |     const response = await page.goto('/signin');
  68  |     expect(response).not.toBeNull();
  69  |     expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
  70  |     expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  71  |     await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  72  |     await syncCalendarFlowContext(page, flow, {
  73  |       note: 'preview-backed signed-out entrypoint is visible with isolation headers applied'
  74  |     });
  75  |   });
  76  | 
  77  |   await test.step('phase: keep the service-worker inspection surface ready for the offline proof', async () => {
  78  |     await expectRuntimeSurfaceReady(page);
  79  |     await syncCalendarFlowContext(page, flow, {
  80  |       note: 'service-worker preview surface is installed before offline continuity proof runs'
  81  |     });
  82  |   });
  83  | });
  84  | 
  85  | test('previously synced calendar weeks reopen offline, keep local writes across reload, deny unsynced ids fail closed, and drain cleanly after reconnect', async ({
  86  |   page,
  87  |   flow
  88  | }) => {
  89  |   const alphaCalendarUrl = `/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`;
  90  |   const betaCalendarUrl = `/calendars/${seededCalendars.betaShared}?start=${seededSchedule.visibleWeek.start}`;
  91  | 
  92  |   await test.step('phase: warm the preview runtime, sign in online, and open the deterministic Alpha week', async () => {
  93  |     flow.mark('preview-shell', '/signin');
  94  |     await page.goto('/signin');
  95  |     await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  96  |     await expectRuntimeSurfaceReady(page);
  97  | 
  98  |     flow.mark('login', seededUsers.alphaMember.email);
  99  |     await signInThroughUi(page, seededUsers.alphaMember);
  100 |     await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
  101 | 
  102 |     await openCalendarWeek({
  103 |       page,
  104 |       flow,
  105 |       calendarId: seededCalendars.alphaShared,
  106 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  107 |       focusShiftIds: [
  108 |         seededSchedule.shifts.morningIntake.id,
  109 |         seededSchedule.shifts.afternoonHandoff.id,
  110 |         seededSchedule.shifts.supplierCall.id
  111 |       ],
  112 |       phase: 'online-warmup-alpha'
  113 |     });
  114 | 
  115 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  116 |     await expect(page.getByTestId('calendar-route-state')).toContainText('trusted-online');
> 117 |     await expect(page.getByTestId('calendar-local-state')).toContainText('online');
      |                                                            ^ Error: expect(locator).toContainText(expected) failed
  118 |     await expect(page.getByTestId('calendar-local-state')).toContainText('0 pending / 0 retryable');
  119 |     await expect(page.getByTestId('calendar-week-board')).toContainText('Server-synced board');
  120 |     await expect(page.getByTestId('calendar-week-board')).toContainText('Online');
  121 |     await expect(page.getByTestId('calendar-week-board')).toContainText('No pending local writes');
  122 |     await expect(shiftCard(page, seededSchedule.shifts.morningIntake.id)).toContainText(seededSchedule.shifts.morningIntake.title);
  123 |     await syncCalendarFlowContext(page, flow, {
  124 |       note: 'trusted online warm-up cached the Alpha calendar week before the offline transition'
  125 |     });
  126 |   });
  127 | 
  128 |   await test.step('phase: warm an explicit online denial for the unsynced Beta id so direct offline navigation stays inspectable', async () => {
  129 |     flow.mark('online-denied-warmup', seededCalendars.betaShared);
  130 |     await page.goto(betaCalendarUrl);
  131 | 
  132 |     const deniedState = page.getByTestId('access-denied-state');
  133 |     await expect(deniedState).toBeVisible();
  134 |     await expect(deniedState).toContainText('calendar-missing');
  135 |     await expect(deniedState).toContainText('calendar-lookup');
  136 |     await expect(deniedState).toContainText(seededCalendars.betaShared);
  137 |     await syncCalendarFlowContext(page, flow, {
  138 |       calendarId: seededCalendars.betaShared,
  139 |       note: 'online denial route rendered once so the offline direct navigation can still boot and fail closed'
  140 |     });
  141 | 
  142 |     await page.goto(alphaCalendarUrl);
  143 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  144 |     await syncCalendarFlowContext(page, flow, {
  145 |       calendarId: seededCalendars.alphaShared,
  146 |       note: 'returned to the permitted Alpha calendar before forcing the browser offline'
  147 |     });
  148 |   });
  149 | 
  150 |   await test.step('phase: force the browser offline and reopen the same Alpha week from cached browser-local continuity', async () => {
  151 |     await setBrowserOffline(page, flow, true, 'forcing the browser offline after the trusted online warm-up');
  152 |     flow.mark('offline-reopen', alphaCalendarUrl);
  153 |     await page.reload();
  154 | 
  155 |     await expect(page.getByTestId('calendar-shell')).toBeVisible();
  156 |     await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
  157 |     await expect(page.getByTestId('calendar-route-state')).toContainText('cached-offline');
  158 |     await expect(page.getByTestId('calendar-local-state')).toContainText('offline');
  159 |     await expect(page.getByTestId('calendar-local-state')).toContainText('0 pending / 0 retryable');
  160 |     await expect(page.getByTestId('calendar-week-board')).toContainText('Cached local board');
  161 |     await expect(page.getByTestId('calendar-week-board')).toContainText('Offline');
  162 |     await expect(page.getByTestId('calendar-week-board')).toContainText('No pending local writes');
  163 |     await expect(shiftCard(page, seededSchedule.shifts.morningIntake.id)).toContainText(seededSchedule.shifts.morningIntake.title);
  164 |     await expect(shiftCard(page, seededSchedule.shifts.afternoonHandoff.id)).toContainText(seededSchedule.shifts.afternoonHandoff.title);
  165 |     await expect(shiftCard(page, seededSchedule.shifts.supplierCall.id)).toContainText(seededSchedule.shifts.supplierCall.title);
  166 |     await syncCalendarFlowContext(page, flow, {
  167 |       calendarId: seededCalendars.alphaShared,
  168 |       visibleWeekStart: seededSchedule.visibleWeek.start,
  169 |       visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
  170 |       focusShiftIds: [
  171 |         seededSchedule.shifts.morningIntake.id,
  172 |         seededSchedule.shifts.afternoonHandoff.id,
  173 |         seededSchedule.shifts.supplierCall.id
  174 |       ],
  175 |       note: 'the permitted Alpha calendar reopened offline from cached browser-local continuity'
  176 |     });
  177 |   });
  178 | 
  179 |   await test.step('phase: create a local-only offline shift and keep the queue diagnostics visible', async () => {
  180 |     flow.mark('offline-create', offlineCreate.title);
  181 |     const createDialog = page.locator('details.shift-editor--create');
  182 | 
  183 |     await createDialog.locator('summary').click();
  184 |     await submitShiftEditorForm(createDialog, {
  185 |       title: offlineCreate.title,
  186 |       startAt: offlineCreate.startLocal,
  187 |       endAt: offlineCreate.endLocal,
  188 |       recurrenceCadence: ''
  189 |     });
  190 | 
  191 |     await expect(page.getByTestId('schedule-action-strip')).toContainText('LOCAL_PENDING_OFFLINE');
  192 |     await expect(page.getByTestId('calendar-local-state')).toContainText('1 pending / 0 retryable');
  193 |     await expect(dayColumn(page, offlineCreate.dayKey)).toContainText(offlineCreate.title);
  194 |     await expect(shiftCardByTitle(page, offlineCreate.title)).toContainText('Local only');
  195 |     await expect(shiftCardByTitle(page, offlineCreate.title)).toContainText('Pending sync');
  196 |     await syncCalendarFlowContext(page, flow, {
  197 |       focusShiftIds: [],
  198 |       note: 'offline create stored a local-only shift and exposed the first pending local write'
  199 |     });
  200 |   });
  201 | 
  202 |   await test.step('phase: edit, move, and delete seeded shifts while offline', async () => {
  203 |     flow.mark('offline-edit', offlineEdit.shiftId);
  204 |     const morningCard = shiftCard(page, offlineEdit.shiftId);
  205 |     const editDialog = morningCard.locator('details:has(summary:has-text("Edit details"))');
  206 | 
  207 |     await editDialog.locator('summary').click();
  208 |     await submitShiftEditorForm(editDialog, {
  209 |       title: offlineEdit.nextTitle,
  210 |       startAt: offlineEdit.nextStartLocal,
  211 |       endAt: offlineEdit.nextEndLocal
  212 |     });
  213 | 
  214 |     await expect(page.getByTestId('calendar-local-state')).toContainText('2 pending / 0 retryable');
  215 |     await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText(offlineEdit.nextTitle);
  216 |     await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText('09:45 → 11:45');
  217 | 
```