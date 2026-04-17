# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> online collaborators see shared shift changes propagate live within the same trusted calendar week
- Location: tests/e2e/calendar-sync.spec.ts:58:1

# Error details

```
Error: expected day 2026-04-16 to show 1 overlap pair(s)

expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: null

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
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
        - code [ref=e23]: 2026-04-17T07:01:22.094Z
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
        - generic [ref=e44]: Default calendar
        - generic [ref=e45]: member access
        - generic [ref=e46]: 8 visible shifts
        - generic [ref=e47]: Trusted online
        - generic [ref=e48]: idle
        - generic [ref=e49]: realtime ready
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - paragraph [ref=e53]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e54]
          - paragraph [ref=e55]: Visible week chosen from the route query.
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: "Visible week start: 2026-04-13"
            - generic [ref=e59]: 8 shifts
            - generic [ref=e60]: UTC board
            - generic [ref=e61]: 1 overlap pair in view
            - generic [ref=e62]: Server-synced board
            - generic [ref=e63]: Online
            - generic [ref=e64]: Sync idle
            - generic [ref=e65]: Sync attempt recorded
            - generic [ref=e66]: No pending local writes
          - navigation "Visible week navigation" [ref=e67]:
            - link "Previous week" [ref=e68] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e69] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e70]:
        - group [ref=e71]:
          - generic "Plan a shift" [ref=e72] [cursor=pointer]
        - generic [ref=e73]:
          - paragraph [ref=e74]: Board rhythm
          - paragraph [ref=e75]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - article [ref=e76]:
        - generic [ref=e77]: Visible-week conflict watch
        - strong [ref=e78]: 1 overlap pair in view
        - paragraph [ref=e79]: Fri, Apr 17 contains 2 conflicting visible shifts.
      - article [ref=e80]:
        - generic [ref=e81]: Board sync diagnostics
        - strong [ref=e82]: Sync idle
        - paragraph [ref=e83]:
          - text: "Last reconnect attempt:"
          - code [ref=e84]: 2026-04-17T07:01:22.094Z
      - article [ref=e85]:
        - generic [ref=e86]: Board realtime diagnostics
        - strong [ref=e87]: ready
        - paragraph [ref=e88]: No shared shift signal has touched this visible week yet.
        - paragraph [ref=e89]: Listening for shared shift changes on this calendar week.
      - generic [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]:
              - paragraph [ref=e94]: Monday
              - heading "Apr 13" [level=3] [ref=e95]
            - generic [ref=e97]: 1 shift
          - article [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e101]:
                - paragraph [ref=e102]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e103]
              - generic [ref=e104]:
                - generic [ref=e105]: 08:30 → 09:00
                - generic [ref=e106]: Occurrence 1
            - generic [ref=e107]:
              - generic [ref=e108]:
                - text: Window
                - strong [ref=e109]: 08:30 → 09:00
              - generic [ref=e110]:
                - text: Duration
                - strong [ref=e111]: 0.5h block
              - generic [ref=e112]:
                - text: Shift id
                - code [ref=e113]: aaaaaaaa-8888-1111-1111-111111111111
            - generic [ref=e114]:
              - group [ref=e115]:
                - generic "Edit details" [ref=e116] [cursor=pointer]
              - group [ref=e117]:
                - generic "Move timing" [ref=e118] [cursor=pointer]
              - button "Delete shift" [ref=e120] [cursor=pointer]
        - generic [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]:
              - paragraph [ref=e124]: Tuesday
              - heading "Apr 14" [level=3] [ref=e125]
            - generic [ref=e127]: 1 shift
          - article [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]:
                - paragraph [ref=e132]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e133]
              - generic [ref=e134]:
                - generic [ref=e135]: 08:30 → 09:00
                - generic [ref=e136]: Occurrence 2
            - generic [ref=e137]:
              - generic [ref=e138]:
                - text: Window
                - strong [ref=e139]: 08:30 → 09:00
              - generic [ref=e140]:
                - text: Duration
                - strong [ref=e141]: 0.5h block
              - generic [ref=e142]:
                - text: Shift id
                - code [ref=e143]: aaaaaaaa-8888-1111-1111-222222222222
            - generic [ref=e144]:
              - group [ref=e145]:
                - generic "Edit details" [ref=e146] [cursor=pointer]
              - group [ref=e147]:
                - generic "Move timing" [ref=e148] [cursor=pointer]
              - button "Delete shift" [ref=e150] [cursor=pointer]
        - generic [ref=e151]:
          - generic [ref=e152]:
            - generic [ref=e153]:
              - paragraph [ref=e154]: Wednesday
              - heading "Apr 15" [level=3] [ref=e155]
            - generic [ref=e157]: 2 shifts
          - generic [ref=e158]:
            - article [ref=e159]:
              - generic [ref=e160]:
                - generic [ref=e161]:
                  - paragraph [ref=e162]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e163]
                - generic [ref=e164]:
                  - generic [ref=e165]: 08:30 → 09:00
                  - generic [ref=e166]: Occurrence 3
              - generic [ref=e167]:
                - generic [ref=e168]:
                  - text: Window
                  - strong [ref=e169]: 08:30 → 09:00
                - generic [ref=e170]:
                  - text: Duration
                  - strong [ref=e171]: 0.5h block
                - generic [ref=e172]:
                  - text: Shift id
                  - code [ref=e173]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e174]:
                - group [ref=e175]:
                  - generic "Edit details" [ref=e176] [cursor=pointer]
                - group [ref=e177]:
                  - generic "Move timing" [ref=e178] [cursor=pointer]
                - button "Delete shift" [ref=e180] [cursor=pointer]
            - article [ref=e181]:
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - paragraph [ref=e184]: One-off shift
                  - heading "Morning intake offline revised" [level=3] [ref=e185]
                - generic [ref=e187]: 09:45 → 11:45
              - generic [ref=e188]:
                - generic [ref=e189]:
                  - text: Window
                  - strong [ref=e190]: 09:45 → 11:45
                - generic [ref=e191]:
                  - text: Duration
                  - strong [ref=e192]: 2h block
                - generic [ref=e193]:
                  - text: Shift id
                  - code [ref=e194]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e195]:
                - group [ref=e196]:
                  - generic "Edit details" [ref=e197] [cursor=pointer]
                - group [ref=e198]:
                  - generic "Move timing" [ref=e199] [cursor=pointer]
                - button "Delete shift" [ref=e201] [cursor=pointer]
        - generic [ref=e202]:
          - generic [ref=e203]:
            - generic [ref=e204]:
              - paragraph [ref=e205]: Thursday
              - heading "Apr 16" [level=3] [ref=e206]
            - generic [ref=e208]: 2 shifts
          - generic [ref=e209]:
            - article [ref=e210]:
              - generic [ref=e211]:
                - generic [ref=e212]:
                  - paragraph [ref=e213]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e214]
                - generic [ref=e215]:
                  - generic [ref=e216]: 08:30 → 09:00
                  - generic [ref=e217]: Occurrence 4
              - generic [ref=e218]:
                - generic [ref=e219]:
                  - text: Window
                  - strong [ref=e220]: 08:30 → 09:00
                - generic [ref=e221]:
                  - text: Duration
                  - strong [ref=e222]: 0.5h block
                - generic [ref=e223]:
                  - text: Shift id
                  - code [ref=e224]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e225]:
                - group [ref=e226]:
                  - generic "Edit details" [ref=e227] [cursor=pointer]
                - group [ref=e228]:
                  - generic "Move timing" [ref=e229] [cursor=pointer]
                - button "Delete shift" [ref=e231] [cursor=pointer]
            - article [ref=e232]:
              - generic [ref=e233]:
                - generic [ref=e234]:
                  - paragraph [ref=e235]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e236]
                - generic [ref=e238]: 12:00 → 14:00
              - generic [ref=e239]:
                - generic [ref=e240]:
                  - text: Window
                  - strong [ref=e241]: 12:00 → 14:00
                - generic [ref=e242]:
                  - text: Duration
                  - strong [ref=e243]: 2h block
                - generic [ref=e244]:
                  - text: Shift id
                  - code [ref=e245]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e246]:
                - group [ref=e247]:
                  - generic "Edit details" [ref=e248] [cursor=pointer]
                - group [ref=e249]:
                  - generic "Move timing" [ref=e250] [cursor=pointer]
                - button "Delete shift" [ref=e252] [cursor=pointer]
        - generic [ref=e253]:
          - generic [ref=e254]:
            - generic:
              - paragraph: Friday
              - heading "Apr 17" [level=3]
            - generic [ref=e255]:
              - generic [ref=e256]: Today
              - generic [ref=e257]: 1 overlap pair
              - generic [ref=e258]: 2 shifts
          - generic [ref=e259]:
            - article [ref=e260]:
              - strong [ref=e261]: 1 overlap pair
              - paragraph [ref=e262]: Offline continuity overlap anchor (16:00 → 17:00) · Supplier call (16:00 → 18:00)
            - article [ref=e263]:
              - generic [ref=e264]:
                - generic [ref=e265]:
                  - paragraph [ref=e266]: One-off shift
                  - heading "Offline continuity overlap anchor" [level=3] [ref=e267]
                - generic [ref=e268]:
                  - generic [ref=e269]: 16:00 → 17:00
                  - generic [ref=e270]: Overlaps 1 visible shift
              - article [ref=e271]:
                - strong [ref=e272]: Overlaps 1 visible shift
                - paragraph [ref=e273]: Supplier call (16:00 → 18:00)
              - generic [ref=e274]:
                - generic [ref=e275]:
                  - text: Window
                  - strong [ref=e276]: 16:00 → 17:00
                - generic [ref=e277]:
                  - text: Duration
                  - strong [ref=e278]: 1h block
                - generic [ref=e279]:
                  - text: Shift id
                  - code [ref=e280]: 0553553c-8f60-4301-b441-464bc67bb719
              - generic [ref=e281]:
                - group [ref=e282]:
                  - generic "Edit details" [ref=e283] [cursor=pointer]
                - group [ref=e284]:
                  - generic "Move timing" [ref=e285] [cursor=pointer]
                - button "Delete shift" [ref=e287] [cursor=pointer]
            - article [ref=e288]:
              - generic [ref=e289]:
                - generic [ref=e290]:
                  - paragraph [ref=e291]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e292]
                - generic [ref=e293]:
                  - generic [ref=e294]: 16:00 → 18:00
                  - generic [ref=e295]: Overlaps 1 visible shift
              - article [ref=e296]:
                - strong [ref=e297]: Overlaps 1 visible shift
                - paragraph [ref=e298]: Offline continuity overlap anchor (16:00 → 17:00)
              - generic [ref=e299]:
                - generic [ref=e300]:
                  - text: Window
                  - strong [ref=e301]: 16:00 → 18:00
                - generic [ref=e302]:
                  - text: Duration
                  - strong [ref=e303]: 2h block
                - generic [ref=e304]:
                  - text: Shift id
                  - code [ref=e305]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e306]:
                - group [ref=e307]:
                  - generic "Edit details" [ref=e308] [cursor=pointer]
                - group [ref=e309]:
                  - generic "Move timing" [ref=e310] [cursor=pointer]
                - button "Delete shift" [ref=e312] [cursor=pointer]
        - generic [ref=e313]:
          - generic [ref=e314]:
            - generic [ref=e315]:
              - paragraph [ref=e316]: Saturday
              - heading "Apr 18" [level=3] [ref=e317]
            - generic [ref=e319]: 0 shifts
          - article [ref=e320]:
            - paragraph [ref=e321]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e322]
            - paragraph [ref=e323]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e324]:
          - generic [ref=e325]:
            - generic [ref=e326]:
              - paragraph [ref=e327]: Sunday
              - heading "Apr 19" [level=3] [ref=e328]
            - generic [ref=e330]: 0 shifts
          - article [ref=e331]:
            - paragraph [ref=e332]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e333]
            - paragraph [ref=e334]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e335]:
      - generic [ref=e336]:
        - generic [ref=e337]:
          - paragraph [ref=e338]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e339]
        - generic [ref=e340]: 2 visible
      - generic [ref=e341]:
        - link "Alpha shared Default calendar" [ref=e342] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e343]: Alpha shared
          - generic [ref=e344]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e345] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e346]: Alpha backlog
          - generic [ref=e347]: Secondary calendar
```

# Test source

```ts
  883  |   shiftId: string;
  884  |   label: string | null;
  885  |   detail: string | null;
  886  |   overlapCount: number | null;
  887  | };
  888  | 
  889  | async function readCountAttribute(locator: Locator, attribute: string) {
  890  |   if ((await locator.count()) === 0) {
  891  |     return null;
  892  |   }
  893  | 
  894  |   const raw = await locator.getAttribute(attribute);
  895  |   if (!raw) {
  896  |     return null;
  897  |   }
  898  | 
  899  |   const parsed = Number.parseInt(raw, 10);
  900  |   return Number.isFinite(parsed) ? parsed : null;
  901  | }
  902  | 
  903  | export async function readBoardConflictSummary(page: Page): Promise<BoardConflictState> {
  904  |   const summary = page.getByTestId('board-conflict-summary');
  905  |   if ((await summary.count()) === 0) {
  906  |     return {
  907  |       visible: false,
  908  |       label: null,
  909  |       detail: null,
  910  |       dayCount: null,
  911  |       shiftCount: null,
  912  |       pairCount: null
  913  |     };
  914  |   }
  915  | 
  916  |   return {
  917  |     visible: await summary.isVisible(),
  918  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  919  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  920  |     dayCount: await readCountAttribute(summary, 'data-conflict-days'),
  921  |     shiftCount: await readCountAttribute(summary, 'data-conflict-shifts'),
  922  |     pairCount: await readCountAttribute(summary, 'data-conflict-pairs')
  923  |   };
  924  | }
  925  | 
  926  | export async function readDayConflictSummary(page: Page, dayKey: string): Promise<DayConflictState> {
  927  |   const summary = page.getByTestId(`day-conflict-summary-${dayKey}`);
  928  |   if ((await summary.count()) === 0) {
  929  |     return {
  930  |       visible: false,
  931  |       dayKey,
  932  |       label: null,
  933  |       detail: null,
  934  |       pairCount: null,
  935  |       shiftCount: null
  936  |     };
  937  |   }
  938  | 
  939  |   return {
  940  |     visible: await summary.isVisible(),
  941  |     dayKey,
  942  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  943  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  944  |     pairCount: await readCountAttribute(summary, 'data-conflict-pairs'),
  945  |     shiftCount: await readCountAttribute(summary, 'data-conflict-shifts')
  946  |   };
  947  | }
  948  | 
  949  | export async function readShiftConflictSummary(page: Page, shiftId: string): Promise<ShiftConflictState> {
  950  |   const summary = page.getByTestId(`shift-conflict-summary-${shiftId}`);
  951  |   if ((await summary.count()) === 0) {
  952  |     return {
  953  |       visible: false,
  954  |       shiftId,
  955  |       label: null,
  956  |       detail: null,
  957  |       overlapCount: null
  958  |     };
  959  |   }
  960  | 
  961  |   return {
  962  |     visible: await summary.isVisible(),
  963  |     shiftId,
  964  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  965  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  966  |     overlapCount: await readCountAttribute(summary, 'data-conflict-overlaps')
  967  |   };
  968  | }
  969  | 
  970  | export async function waitForBoardConflictPairs(page: Page, expectedPairCount: number | null, timeout = 20_000) {
  971  |   await expect
  972  |     .poll(async () => (await readBoardConflictSummary(page)).pairCount, {
  973  |       timeout,
  974  |       message:
  975  |         expectedPairCount === null
  976  |           ? 'expected the board conflict summary to stay absent'
  977  |           : `expected the board conflict summary to show ${expectedPairCount} overlap pair(s)`
  978  |     })
  979  |     .toBe(expectedPairCount);
  980  | }
  981  | 
  982  | export async function waitForDayConflictPairs(page: Page, dayKey: string, expectedPairCount: number | null, timeout = 20_000) {
> 983  |   await expect
       |   ^ Error: expected day 2026-04-16 to show 1 overlap pair(s)
  984  |     .poll(async () => (await readDayConflictSummary(page, dayKey)).pairCount, {
  985  |       timeout,
  986  |       message:
  987  |         expectedPairCount === null
  988  |           ? `expected day ${dayKey} to stay conflict-free`
  989  |           : `expected day ${dayKey} to show ${expectedPairCount} overlap pair(s)`
  990  |     })
  991  |     .toBe(expectedPairCount);
  992  | }
  993  | 
  994  | export async function waitForShiftConflictOverlaps(page: Page, shiftId: string, expectedOverlapCount: number | null, timeout = 20_000) {
  995  |   await expect
  996  |     .poll(async () => (await readShiftConflictSummary(page, shiftId)).overlapCount, {
  997  |       timeout,
  998  |       message:
  999  |         expectedOverlapCount === null
  1000 |           ? `expected shift ${shiftId} to stay conflict-free`
  1001 |           : `expected shift ${shiftId} to show ${expectedOverlapCount} visible overlap(s)`
  1002 |     })
  1003 |     .toBe(expectedOverlapCount);
  1004 | }
  1005 | 
  1006 | export async function waitForQueueSummary(page: Page, expectedSummary: string | RegExp, timeout = 20_000) {
  1007 |   const message = `expected queue summary to become ${String(expectedSummary)}`;
  1008 | 
  1009 |   if (expectedSummary instanceof RegExp) {
  1010 |     await expect
  1011 |       .poll(async () => (await readStateText(page, 'calendar-local-state', 'code')) ?? '', {
  1012 |         timeout,
  1013 |         message
  1014 |       })
  1015 |       .toMatch(expectedSummary);
  1016 |     return;
  1017 |   }
  1018 | 
  1019 |   await expect
  1020 |     .poll(async () => await readStateText(page, 'calendar-local-state', 'code'), {
  1021 |       timeout,
  1022 |       message
  1023 |     })
  1024 |     .toBe(expectedSummary);
  1025 | }
  1026 | 
  1027 | export async function waitForLocalSnapshotStatus(page: Page, expectedStatus: 'ready' | 'failed' | 'idle', timeout = 20_000) {
  1028 |   await expect
  1029 |     .poll(async () => page.getByTestId('calendar-local-state').getAttribute('data-snapshot-status'), {
  1030 |       timeout,
  1031 |       message: `expected local snapshot status to become ${expectedStatus}`
  1032 |     })
  1033 |     .toBe(expectedStatus);
  1034 | }
  1035 | 
  1036 | export async function waitForSyncAttempt(page: Page, timeout = 20_000) {
  1037 |   await expect
  1038 |     .poll(async () => (await readStateText(page, 'calendar-sync-state', 'code')) ?? '', {
  1039 |       timeout,
  1040 |       message: 'expected reconnect diagnostics to record a last-attempt marker'
  1041 |     })
  1042 |     .not.toBe('No reconnect attempt yet');
  1043 | }
  1044 | 
  1045 | export async function waitForSyncPhase(page: Page, expectedPhase: string | RegExp, timeout = 20_000) {
  1046 |   const message = `expected sync phase to become ${String(expectedPhase)}`;
  1047 | 
  1048 |   if (expectedPhase instanceof RegExp) {
  1049 |     await expect
  1050 |       .poll(async () => (await readStateText(page, 'calendar-sync-state', 'strong')) ?? '', {
  1051 |         timeout,
  1052 |         message
  1053 |       })
  1054 |       .toMatch(expectedPhase);
  1055 |     return;
  1056 |   }
  1057 | 
  1058 |   await expect
  1059 |     .poll(async () => await readStateText(page, 'calendar-sync-state', 'strong'), {
  1060 |       timeout,
  1061 |       message
  1062 |     })
  1063 |     .toBe(expectedPhase);
  1064 | }
  1065 | 
  1066 | export type RealtimeDiagnosticsState = {
  1067 |   channelState: string | null;
  1068 |   remoteRefreshState: string | null;
  1069 |   signalSummary: string | null;
  1070 |   detail: string | null;
  1071 |   reason: string | null;
  1072 | };
  1073 | 
  1074 | export async function readRealtimeDiagnosticsState(page: Page): Promise<RealtimeDiagnosticsState> {
  1075 |   return {
  1076 |     channelState: await page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'),
  1077 |     remoteRefreshState: await page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'),
  1078 |     signalSummary: await readStateText(page, 'calendar-realtime-state', 'code'),
  1079 |     detail: await readStateText(page, 'calendar-realtime-state', 'p:last-of-type'),
  1080 |     reason: await readStateText(page, 'calendar-realtime-state', 'code:last-of-type')
  1081 |   };
  1082 | }
  1083 | 
```