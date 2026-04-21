import {
  buildCalendarPath,
  buildMutationQueueKey,
  clearPersistedSession,
  corruptAppShellContinuity,
  corruptOfflineMutationQueue,
  expect,
  openCalendar,
  seededCalendars,
  seededUsers,
  seededWeekStarts,
  setSimulatedConnectivity,
  signInThroughUi,
  test,
  waitForPendingCount,
  waitForRetryableCount
} from './fixtures';

const warmWeekStart = seededWeekStarts.alphaWarm;
const warmCalendarPath = buildCalendarPath(seededCalendars.alphaShared, warmWeekStart);
const seededEditableShiftId = 'aaaaaaaa-6666-1111-1111-111111111111';

test.describe.configure({ mode: 'serial' });

test('trusted warm-up reopens offline, keeps multiple queued edits across reload, and drains them after reconnect', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'query');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
  await waitForPendingCount(page, 0);
  await waitForRetryableCount(page, 0);
  await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake');

  await setSimulatedConnectivity(page, false);
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');

  await page.getByTestId('create-shift-trigger-create-week').click();
  await expect(page.getByTestId('create-shift-editor')).toBeVisible();
  await page.getByTestId('create-title-input').fill('Offline opening backup');
  await page.getByTestId('create-start-input').fill('2026-04-15T16:00');
  await page.getByTestId('create-end-input').fill('2026-04-15T18:00');
  await page.getByTestId('create-shift-editor').locator('form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  await page.getByTestId(`edit-shift-trigger-edit-${seededEditableShiftId}`).click();
  await expect(page.getByTestId('edit-shift-editor')).toBeVisible();
  await page.getByTestId('edit-title-input').fill('Morning intake offline edit');
  await page.getByTestId('edit-shift-editor').locator('form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  await waitForPendingCount(page, 2);
  await waitForRetryableCount(page, 0);
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-board-source', 'cached-local');
  await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  await expect(page.locator('[data-local-only="true"]')).toContainText('Offline opening backup');

  await clearPersistedSession(page);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${warmCalendarPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'cached-offline');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-route-mode', 'cached-offline');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-network', 'offline');
  await waitForPendingCount(page, 2);
  await waitForRetryableCount(page, 0);
  await expect(page.getByTestId('mobile-calendar-readonly')).toBeVisible();
  await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  await expect(page.locator('[data-local-only="true"]')).toContainText('Offline opening backup');

  await setSimulatedConnectivity(page, true, { waitForCalendarUi: false });
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-network', 'online');

  const drainButton = page.getByTestId('calendar-drain-button');
  if ((await page.getByTestId('calendar-route-state').getAttribute('data-pending-count')) !== '0' && (await drainButton.isEnabled())) {
    await drainButton.click();
  }

  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', '0');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', '0');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-sync-phase', 'idle');
  await expect(page.locator('[data-local-only="true"]')).toHaveCount(0);
  await expect(page.getByTestId(`shift-card-${seededEditableShiftId}`)).toContainText('Morning intake offline edit');
  await expect(page.getByTestId('mobile-calendar-board')).toContainText('Offline opening backup');
});

test('offline continuity fails closed for unsynced calendars and corrupt cached shell snapshots', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  await clearPersistedSession(page);
  await setSimulatedConnectivity(page, false);

  await page.goto(buildCalendarPath(seededCalendars.betaShared, warmWeekStart));
  await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-not-synced');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-attempted-calendar-id', seededCalendars.betaShared);

  await corruptAppShellContinuity(page, 'not-json');
  await page.goto(warmCalendarPath);
  await expect(page.getByTestId('mobile-continuity-denied')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'cache-parse-failed');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'continuity');
});

test('invalid week params and malformed queued payloads stay attributable through explicit diagnostics', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId: seededCalendars.alphaShared,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  await page.goto(`/calendars/${seededCalendars.alphaShared}?start=not-a-date`);
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'fallback-invalid');

  await corruptOfflineMutationQueue(page, {
    userId: seededUsers.alphaMember.id,
    calendarId: seededCalendars.alphaShared,
    weekStart: warmWeekStart,
    raw: '{not-json'
  });
  await page.goto(warmCalendarPath);
  await expect(page.getByTestId('calendar-shell')).toBeVisible();
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-queue-state', 'malformed');
  await expect(page.getByTestId('calendar-queue-strip')).toContainText('queue-entry-invalid');
  await expect(page.getByTestId('calendar-queue-strip')).toContainText('was cleared instead of being replayed');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-pending-count', '0');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-retryable-count', '0');
});
