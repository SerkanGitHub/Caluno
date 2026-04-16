# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> online collaborators see shared shift changes propagate live within the same trusted calendar week
- Location: tests/e2e/calendar-sync.spec.ts:50:1

# Error details

```
Error: expected queue summary to become 0 pending / 0 retryable

expect(received).toBe(expected) // Object.is equality

Expected: "0 pending / 0 retryable"
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
  579 |     visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
  580 |     focusShiftIds,
  581 |     note: `calendar route ${targetUrl}`
  582 |   });
  583 | 
  584 |   try {
  585 |     await page.goto(targetUrl);
  586 |   } catch (error) {
  587 |     const message = error instanceof Error ? error.message : String(error);
  588 |     if (!message.includes('net::ERR_ABORTED')) {
  589 |       throw error;
  590 |     }
  591 | 
  592 |     await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  593 |   }
  594 |   await expect(page.getByTestId('calendar-shell')).toBeVisible();
  595 |   await expect(page.getByTestId('calendar-week-board')).toBeVisible();
  596 | 
  597 |   const boardWeek = await readVisibleWeekFromBoard(page);
  598 |   expect(boardWeek.visibleWeekStart).toBe(visibleWeekStart);
  599 |   expect(boardWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
  600 | 
  601 |   await syncCalendarFlowContext(page, flow, {
  602 |     calendarId,
  603 |     visibleWeekStart: boardWeek.visibleWeekStart,
  604 |     visibleWeekEndExclusive: boardWeek.visibleWeekEndExclusive,
  605 |     focusShiftIds,
  606 |     note: `calendar route ${targetUrl}`
  607 |   });
  608 | }
  609 | 
  610 | export async function expectRuntimeSurfaceReady(page: Page) {
  611 |   const runtimeSurface = page.getByTestId('offline-runtime-surface');
  612 | 
  613 |   await expect(runtimeSurface).toBeVisible();
  614 |   await expect(runtimeSurface).toHaveAttribute('data-offline-proof-surface', 'service-worker-preview');
  615 |   await expect
  616 |     .poll(
  617 |       async () => runtimeSurface.getAttribute('data-service-worker-status'),
  618 |       {
  619 |         timeout: 15_000,
  620 |         message: 'expected the service worker registration to reach an installable or ready state'
  621 |       }
  622 |     )
  623 |     .toMatch(/installed|ready/);
  624 | 
  625 |   return runtimeSurface;
  626 | }
  627 | 
  628 | export async function syncCalendarFlowContext(page: Page, flow: FlowDiagnostics, patch: Partial<FlowContext> = {}) {
  629 |   const snapshot = await readFlowSurfaceSnapshot(page);
  630 |   flow.setContext({
  631 |     ...snapshot,
  632 |     ...patch,
  633 |     boardMetaBadges: patch.boardMetaBadges ?? snapshot.boardMetaBadges,
  634 |     actionReasons: patch.actionReasons ?? snapshot.actionReasons,
  635 |     actionSummaries: patch.actionSummaries ?? snapshot.actionSummaries
  636 |   });
  637 |   return snapshot;
  638 | }
  639 | 
  640 | export async function setBrowserOffline(page: Page, flow: FlowDiagnostics, offline: boolean, note?: string) {
  641 |   flow.mark(offline ? 'offline-transition' : 'online-transition', note);
  642 |   await page.context().setOffline(offline);
  643 |   await expect
  644 |     .poll(
  645 |       async () => page.evaluate(() => navigator.onLine),
  646 |       {
  647 |         timeout: 10_000,
  648 |         message: `expected navigator.onLine to become ${offline ? 'false' : 'true'}`
  649 |       }
  650 |     )
  651 |     .toBe(!offline);
  652 |   await syncCalendarFlowContext(page, flow, {
  653 |     note: note ?? (offline ? 'browser context forced offline' : 'browser context restored online')
  654 |   });
  655 | }
  656 | 
  657 | async function readStateText(page: Page, testId: string, selector: string) {
  658 |   const locator = page.getByTestId(testId).locator(selector).first();
  659 |   if ((await locator.count()) === 0) {
  660 |     return null;
  661 |   }
  662 | 
  663 |   return (await locator.textContent())?.trim() ?? null;
  664 | }
  665 | 
  666 | export async function waitForQueueSummary(page: Page, expectedSummary: string | RegExp, timeout = 20_000) {
  667 |   const message = `expected queue summary to become ${String(expectedSummary)}`;
  668 | 
  669 |   if (expectedSummary instanceof RegExp) {
  670 |     await expect
  671 |       .poll(async () => (await readStateText(page, 'calendar-local-state', 'code')) ?? '', {
  672 |         timeout,
  673 |         message
  674 |       })
  675 |       .toMatch(expectedSummary);
  676 |     return;
  677 |   }
  678 | 
> 679 |   await expect
      |   ^ Error: expected queue summary to become 0 pending / 0 retryable
  680 |     .poll(async () => await readStateText(page, 'calendar-local-state', 'code'), {
  681 |       timeout,
  682 |       message
  683 |     })
  684 |     .toBe(expectedSummary);
  685 | }
  686 | 
  687 | export async function waitForSyncAttempt(page: Page, timeout = 20_000) {
  688 |   await expect
  689 |     .poll(async () => (await readStateText(page, 'calendar-sync-state', 'code')) ?? '', {
  690 |       timeout,
  691 |       message: 'expected reconnect diagnostics to record a last-attempt marker'
  692 |     })
  693 |     .not.toBe('No reconnect attempt yet');
  694 | }
  695 | 
  696 | export async function waitForSyncPhase(page: Page, expectedPhase: string | RegExp, timeout = 20_000) {
  697 |   const message = `expected sync phase to become ${String(expectedPhase)}`;
  698 | 
  699 |   if (expectedPhase instanceof RegExp) {
  700 |     await expect
  701 |       .poll(async () => (await readStateText(page, 'calendar-sync-state', 'strong')) ?? '', {
  702 |         timeout,
  703 |         message
  704 |       })
  705 |       .toMatch(expectedPhase);
  706 |     return;
  707 |   }
  708 | 
  709 |   await expect
  710 |     .poll(async () => await readStateText(page, 'calendar-sync-state', 'strong'), {
  711 |       timeout,
  712 |       message
  713 |     })
  714 |     .toBe(expectedPhase);
  715 | }
  716 | 
  717 | export async function waitForRealtimeChannelReady(page: Page, timeout = 20_000) {
  718 |   await expect
  719 |     .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'), {
  720 |       timeout,
  721 |       message: 'expected the realtime channel state to reach ready'
  722 |     })
  723 |     .toBe('ready');
  724 | }
  725 | 
  726 | export async function waitForRemoteRefreshApplied(page: Page, timeout = 20_000) {
  727 |   await expect
  728 |     .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'), {
  729 |       timeout,
  730 |       message: 'expected realtime diagnostics to confirm a trusted refresh was applied'
  731 |     })
  732 |     .toBe('applied');
  733 | }
  734 | 
  735 | export async function createTrackedSession(params: {
  736 |   browser: Browser;
  737 |   testInfo: TestInfo;
  738 |   attachmentName: string;
  739 |   contextOptions?: BrowserContextOptions;
  740 | }): Promise<{
  741 |   context: BrowserContext;
  742 |   page: Page;
  743 |   flow: FlowDiagnostics;
  744 |   close: () => Promise<void>;
  745 | }> {
  746 |   const configuredBaseURL = params.testInfo.project.use.baseURL;
  747 |   const baseURL = typeof configuredBaseURL === 'string' ? configuredBaseURL : undefined;
  748 |   const context = await params.browser.newContext({
  749 |     baseURL,
  750 |     ...(params.contextOptions ?? {})
  751 |   });
  752 |   const page = await context.newPage();
  753 |   const flow = createFlowDiagnostics(page, params.testInfo, params.attachmentName);
  754 |   flow.mark('session-start', params.attachmentName);
  755 | 
  756 |   let closed = false;
  757 | 
  758 |   return {
  759 |     context,
  760 |     page,
  761 |     flow,
  762 |     async close() {
  763 |       if (closed) {
  764 |         return;
  765 |       }
  766 | 
  767 |       closed = true;
  768 |       await flow.attach().catch(() => undefined);
  769 |       await context.close();
  770 |     }
  771 |   };
  772 | }
  773 | 
  774 | export async function openTrackedCalendarSession(params: {
  775 |   browser: Browser;
  776 |   testInfo: TestInfo;
  777 |   attachmentName: string;
  778 |   user: SeededUser;
  779 |   calendarId: string;
```