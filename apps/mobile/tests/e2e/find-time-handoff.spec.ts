import {
  expect,
  expectedCreateShiftPrefillValues,
  openCalendar,
  openFindTimeRoute,
  readCreateSheetArrivalSnapshot,
  readFindTimeBrowseWindowCtaSnapshot,
  readFindTimeBrowseWindowSnapshot,
  readFindTimeTopPickCtaSnapshot,
  readFindTimeTopPickSnapshot,
  readVisibleWeekFromBoard,
  seededCalendars,
  seededFindTime,
  seededUsers,
  seededWeekStarts,
  setSimulatedConnectivity,
  signInThroughUi,
  submitHandoffBackedCreateForm,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const calendarId = seededCalendars.alphaShared;
const visibleWeekStart = seededWeekStarts.alphaWarm;
const createdShiftTitle = 'Find time handoff coverage shift';

test('permitted member can enter from the real board, verify ranked results, hand a chosen slot into create, and reload without reopening', async ({
  page
}) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: visibleWeekStart,
    expectedName: 'Alpha shared'
  });

  const entrypoint = page.getByTestId('find-time-entrypoint');
  await expect(entrypoint).toBeVisible();
  await expect(entrypoint).toHaveAttribute('data-entry-calendar-id', calendarId);
  await expect(entrypoint).toHaveAttribute('data-entry-week-start', visibleWeekStart);
  await expect(entrypoint).toHaveAttribute('data-entry-duration', seededFindTime.durationMinutes);

  await Promise.all([page.waitForURL(new RegExp(`/calendars/${calendarId}/find-time`)), entrypoint.click()]);
  await expect(page.getByTestId('find-time-shell')).toBeVisible();
  await expect(page.getByTestId('find-time-start-input')).toHaveValue(visibleWeekStart);
  await expect(page.getByTestId('find-time-duration-input')).toHaveValue(seededFindTime.durationMinutes);

  await page.getByTestId('find-time-start-input').fill(seededFindTime.start);
  await Promise.all([
    page.waitForURL(
      new RegExp(`/calendars/${calendarId}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`)
    ),
    page.getByTestId('find-time-submit').click()
  ]);

  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'none');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
  await expect(page.getByTestId('find-time-search-state')).toHaveAttribute('data-status', 'ready');

  const liveWindowCount = Number.parseInt(
    (await page.getByTestId('find-time-results').getAttribute('data-window-count')) ?? '0',
    10
  );
  const liveBrowseCount = Number.parseInt(
    (await page.getByTestId('find-time-route-state').getAttribute('data-browse-count')) ?? '0',
    10
  );

  expect(liveWindowCount).toBeGreaterThanOrEqual(seededFindTime.topPickCount + 1);
  expect(liveBrowseCount).toBeGreaterThanOrEqual(1);
  expect(liveWindowCount).toBe(seededFindTime.topPickCount + liveBrowseCount);

  await expect(page.getByTestId('find-time-summary')).toContainText(`${liveWindowCount} truthful windows`);
  await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
  await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-browse-count', String(liveBrowseCount));

  await expect(
    page.evaluate(() => {
      const topPicks = document.querySelector('[data-testid="find-time-top-picks"]');
      const browse = document.querySelector('[data-testid="find-time-browse-results"]');

      if (!topPicks || !browse) {
        return false;
      }

      return Boolean(topPicks.compareDocumentPosition(browse) & Node.DOCUMENT_POSITION_FOLLOWING);
    })
  ).resolves.toBe(true);

  await expect(await readFindTimeTopPickSnapshot(page, 0)).toMatchObject({
    ...seededFindTime.topPicks[0],
    handoffReady: 'true'
  });
  await expect(await readFindTimeTopPickSnapshot(page, 1)).toMatchObject({
    rank: '2',
    handoffReady: 'true'
  });
  await expect(await readFindTimeTopPickSnapshot(page, 2)).toMatchObject({
    rank: '3',
    handoffReady: 'true'
  });

  const focusedBrowseCard = page
    .locator(
      `[data-testid^="find-time-browse-window-"][data-start-at="${seededFindTime.focusedBrowseWindow.startAt}"][data-end-at="${seededFindTime.focusedBrowseWindow.endAt}"]`
    )
    .first();
  await expect(focusedBrowseCard).toBeVisible();
  const focusedBrowseTestId = await focusedBrowseCard.getAttribute('data-testid');
  const focusedBrowseIndex = Number.parseInt((focusedBrowseTestId ?? '').replace('find-time-browse-window-', ''), 10);

  expect(Number.isFinite(focusedBrowseIndex), 'expected the seeded browse window to expose a deterministic test id').toBe(true);
  await expect(await readFindTimeBrowseWindowSnapshot(page, focusedBrowseIndex)).toMatchObject({
    rank: seededFindTime.focusedBrowseWindow.rank,
    startAt: seededFindTime.focusedBrowseWindow.startAt,
    endAt: seededFindTime.focusedBrowseWindow.endAt,
    spanStartAt: seededFindTime.focusedBrowseWindow.spanStartAt,
    spanEndAt: seededFindTime.focusedBrowseWindow.spanEndAt,
    availableMembers: seededFindTime.focusedBrowseWindow.availableMembers,
    blockedMembers: seededFindTime.focusedBrowseWindow.blockedMembers,
    leadingConstraints: seededFindTime.focusedBrowseWindow.leadingConstraints,
    trailingConstraints: [expect.stringContaining('Alice Owner:Morning intake')],
    handoffReady: 'true'
  });

  const chosenSuggestion = await readFindTimeTopPickCtaSnapshot(page, 0);
  await expect(chosenSuggestion).toMatchObject({
    source: 'find-time',
    targetWeekStart: visibleWeekStart,
    startAt: seededFindTime.topPicks[0].startAt,
    endAt: seededFindTime.topPicks[0].endAt,
    label: 'Create from this slot'
  });
  await expect(await readFindTimeBrowseWindowCtaSnapshot(page, focusedBrowseIndex)).toMatchObject({
    source: 'find-time',
    targetWeekStart: visibleWeekStart,
    startAt: seededFindTime.focusedBrowseWindow.startAt,
    endAt: seededFindTime.focusedBrowseWindow.endAt,
    label: 'Create from this slot'
  });

  await page.getByTestId('find-time-top-pick-0-cta').click();

  const visibleWeek = await readVisibleWeekFromBoard(page);
  expect(visibleWeek.visibleWeekStart).toBe(visibleWeekStart);
  expect(visibleWeek.boardWeekStart).toBe(visibleWeekStart);

  const arrival = await readCreateSheetArrivalSnapshot(page);
  const expectedPrefillValues = expectedCreateShiftPrefillValues(chosenSuggestion);

  expect(arrival.open).toBe(true);
  expect(arrival.routePrefillStatus).toBe('accepted');
  expect(arrival.routePrefillSource).toBe('find-time');
  expect(arrival.routePrefillStart).toBe(chosenSuggestion.startAt);
  expect(arrival.routePrefillEnd).toBe(chosenSuggestion.endAt);
  expect(arrival.openOnArrival).toBe('true');
  expect(arrival.createSource).toBe('find-time');
  expect(arrival.prefillSource).toBe('find-time');
  expect(arrival.prefillStart).toBe(chosenSuggestion.startAt);
  expect(arrival.prefillEnd).toBe(chosenSuggestion.endAt);
  expect(arrival.startValue).toBe(expectedPrefillValues.startValue);
  expect(arrival.endValue).toBe(expectedPrefillValues.endValue);

  await expect
    .poll(() => page.url(), {
      message: 'expected the calendar route to strip one-shot handoff params after the first arrival render'
    })
    .toBe(`http://127.0.0.1:4173/calendars/${calendarId}?start=${visibleWeekStart}`);

  await submitHandoffBackedCreateForm(page, { title: createdShiftTitle });
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', '0');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', '0');
  await expect(
    page.getByTestId('day-column-2026-04-16').locator('[data-testid^="shift-card-"]').filter({ hasText: createdShiftTitle }).first()
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}\\?start=${visibleWeekStart}$`));
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-source', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-start', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-end', 'none');
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  await expect(page.getByTestId('create-prefill-source')).toHaveCount(0);
  await expect(
    page.getByTestId('day-column-2026-04-16').locator('[data-testid^="shift-card-"]').filter({ hasText: createdShiftTitle }).first()
  ).toBeVisible();
});

test('out-of-scope mobile find-time routes stay explicitly denied with zero result cards', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openFindTimeRoute(page, {
    calendarId: seededCalendars.betaShared,
    durationMinutes: seededFindTime.durationMinutes,
    start: seededFindTime.start
  });

  await expect(page.getByTestId('find-time-denied-state')).toBeVisible();
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'denied');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'calendar-missing');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-denial-phase', 'calendar-lookup');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-top-pick-count', '0');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-browse-count', '0');
  await expect(page.getByTestId('find-time-denied-state')).toContainText(seededCalendars.betaShared);
  await expect(page.getByTestId('find-time-top-picks')).toHaveCount(0);
  await expect(page.getByTestId('find-time-browse-results')).toHaveCount(0);
});

test('offline route entry stays fail-closed as offline-unavailable with zero result cards', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: visibleWeekStart,
    expectedName: 'Alpha shared'
  });

  const warmedFindTimeUrl = await page.getByTestId('find-time-entrypoint').getAttribute('href');
  expect(warmedFindTimeUrl).toContain(`/calendars/${calendarId}/find-time`);

  await setSimulatedConnectivity(page, false);
  await page.goto(warmedFindTimeUrl ?? `/calendars/${calendarId}/find-time?duration=60&start=${visibleWeekStart}`);

  await expect(page.getByTestId('find-time-offline-state')).toBeVisible();
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'offline-unavailable');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'FIND_TIME_OFFLINE');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-denial-phase', 'connectivity');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-network', 'offline');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-top-pick-count', '0');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-browse-count', '0');
  await expect(page.getByTestId('find-time-top-picks')).toHaveCount(0);
  await expect(page.getByTestId('find-time-browse-results')).toHaveCount(0);
});

test('malformed arrival-prefill params stay attributable, do not auto-open create, and are gone after reload', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);

  await page.goto(
    `/calendars/${calendarId}?create=1&start=${visibleWeekStart}&prefillStartAt=not-an-iso&prefillEndAt=2026-04-16T16:00:00.000Z&source=find-time`
  );
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'rejected');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-source', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-start', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-end', 'none');
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  await expect(page.getByTestId('create-prefill-source')).toHaveCount(0);
  await expect
    .poll(() => page.url(), {
      message: 'expected malformed one-shot handoff params to be stripped immediately after route resolution'
    })
    .toBe(`http://127.0.0.1:4173/calendars/${calendarId}?start=${visibleWeekStart}`);

  await page.reload();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
});
