import type { Page } from '@playwright/test';
import {
  expect,
  expectRuntimeSurfaceReady,
  openCalendarWeek,
  readBoardConflictSummary,
  readDayConflictSummary,
  readShiftConflictSummary,
  resolveVisibleShiftCardIdentity,
  seededCalendars,
  seededSchedule,
  seededUsers,
  setBrowserOffline,
  signInThroughUi,
  submitShiftEditorForm,
  syncCalendarFlowContext,
  test,
  waitForBoardConflictPairs,
  waitForDayConflictPairs,
  waitForQueueSummary,
  waitForShiftConflictOverlaps,
  waitForSyncAttempt,
  waitForSyncPhase
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const offlineCreate = {
  title: 'Offline continuity overlap anchor',
  dayKey: '2026-04-17',
  startLocal: '2026-04-17T16:00',
  endLocal: '2026-04-17T17:00'
} as const;

const offlineEdit = {
  shiftId: seededSchedule.shifts.morningIntake.id,
  nextTitle: 'Morning intake offline revised',
  nextStartLocal: '2026-04-15T09:45',
  nextEndLocal: '2026-04-15T11:45'
} as const;

const offlineMove = {
  shiftId: seededSchedule.shifts.supplierCall.id,
  title: seededSchedule.shifts.supplierCall.title,
  fromDayKey: seededSchedule.shifts.supplierCall.dayKey,
  toDayKey: '2026-04-17',
  nextStartLocal: '2026-04-17T16:00',
  nextEndLocal: '2026-04-17T18:00'
} as const;

function dayColumn(page: Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

function shiftCard(page: Page, shiftId: string) {
  return page.getByTestId(`shift-card-${shiftId}`);
}

function shiftCardInDay(page: Page, dayKey: string, shiftId: string) {
  return dayColumn(page, dayKey).getByTestId(`shift-card-${shiftId}`);
}

test('preview proof surface exposes isolation headers and a live service worker before offline continuity begins', async ({
  page,
  flow
}) => {
  await test.step('phase: open the signed-out preview surface and verify the isolation headers', async () => {
    flow.mark('preview-shell', '/signin');

    const response = await page.goto('/signin');
    expect(response).not.toBeNull();
    expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
    expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
    await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
    await syncCalendarFlowContext(page, flow, {
      note: 'preview-backed signed-out entrypoint is visible with isolation headers applied'
    });
  });

  await test.step('phase: keep the service-worker inspection surface ready for the offline proof', async () => {
    await expectRuntimeSurfaceReady(page);
    await syncCalendarFlowContext(page, flow, {
      note: 'service-worker preview surface is installed before offline continuity proof runs'
    });
  });
});

test('previously synced calendar weeks reopen offline, keep local writes across reload, deny unsynced ids fail closed, and drain cleanly after reconnect', async ({
  page,
  flow
}) => {
  const alphaCalendarUrl = `/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`;
  const betaCalendarUrl = `/calendars/${seededCalendars.betaShared}?start=${seededSchedule.visibleWeek.start}`;
  let offlineCreateShiftId: string | null = null;

  await test.step('phase: warm the preview runtime, sign in online, and open the deterministic Alpha week', async () => {
    flow.mark('preview-shell', '/signin');
    await page.goto('/signin');
    await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
    await expectRuntimeSurfaceReady(page);

    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      focusShiftIds: [
        seededSchedule.shifts.morningIntake.id,
        seededSchedule.shifts.afternoonHandoff.id,
        seededSchedule.shifts.supplierCall.id
      ],
      phase: 'online-warmup-alpha'
    });

    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('calendar-route-state')).toContainText('trusted-online');
    await expect(page.getByTestId('calendar-local-state')).toContainText('online');
    await expect(page.getByTestId('calendar-local-state')).toContainText('0 pending / 0 retryable');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Server-synced board');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Online');
    await expect(page.getByTestId('calendar-week-board')).toContainText('No pending local writes');
    await expect(shiftCard(page, seededSchedule.shifts.morningIntake.id)).toContainText(seededSchedule.shifts.morningIntake.title);
    await syncCalendarFlowContext(page, flow, {
      note: 'trusted online warm-up cached the Alpha calendar week before the offline transition'
    });
  });

  await test.step('phase: warm an explicit online denial for the unsynced Beta id so direct offline navigation stays inspectable', async () => {
    flow.mark('online-denied-warmup', seededCalendars.betaShared);
    await page.goto(betaCalendarUrl);

    const deniedState = page.getByTestId('access-denied-state');
    await expect(deniedState).toBeVisible();
    await expect(deniedState).toContainText('calendar-missing');
    await expect(deniedState).toContainText('calendar-lookup');
    await expect(deniedState).toContainText(seededCalendars.betaShared);
    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.betaShared,
      note: 'online denial route rendered once so the offline direct navigation can still boot and fail closed'
    });

    await page.goto(alphaCalendarUrl);
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.alphaShared,
      note: 'returned to the permitted Alpha calendar before forcing the browser offline'
    });
  });

  await test.step('phase: force the browser offline and reopen the same Alpha week from cached browser-local continuity', async () => {
    await setBrowserOffline(page, flow, true, 'forcing the browser offline after the trusted online warm-up');
    flow.mark('offline-reopen', alphaCalendarUrl);
    await page.reload();

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('calendar-route-state')).toContainText('cached-offline');
    await expect(page.getByTestId('calendar-local-state')).toContainText('offline');
    await expect(page.getByTestId('calendar-local-state')).toContainText('0 pending / 0 retryable');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Cached local board');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Offline');
    await expect(page.getByTestId('calendar-week-board')).toContainText('No pending local writes');
    await expect(shiftCard(page, seededSchedule.shifts.morningIntake.id)).toContainText(seededSchedule.shifts.morningIntake.title);
    await expect(shiftCard(page, seededSchedule.shifts.afternoonHandoff.id)).toContainText(seededSchedule.shifts.afternoonHandoff.title);
    await expect(shiftCard(page, seededSchedule.shifts.supplierCall.id)).toContainText(seededSchedule.shifts.supplierCall.title);

    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, '2026-04-16', 1);
    await waitForDayConflictPairs(page, '2026-04-15', null);
    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.kitchenPrep.id, 1);
    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.supplierCall.id, 1);

    const seededBoardConflict = await readBoardConflictSummary(page);
    expect(seededBoardConflict.dayCount).toBe(1);
    expect(seededBoardConflict.shiftCount).toBe(2);

    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: [
        seededSchedule.shifts.kitchenPrep.id,
        seededSchedule.shifts.supplierCall.id
      ],
      note: 'the permitted Alpha calendar reopened offline from cached browser-local continuity with the seeded Thursday overlap still visible'
    });
  });

  await test.step('phase: create a local-only offline anchor shift without widening the conflict scope yet', async () => {
    flow.mark('offline-create', offlineCreate.title);
    const createDialog = page.locator('details.shift-editor--create');

    await createDialog.locator('summary').click();
    await submitShiftEditorForm(createDialog, {
      title: offlineCreate.title,
      startAt: offlineCreate.startLocal,
      endAt: offlineCreate.endLocal,
      recurrenceCadence: ''
    });

    const createdShift = await resolveVisibleShiftCardIdentity({
      page,
      title: offlineCreate.title,
      dayKey: offlineCreate.dayKey,
      windowLabel: '16:00 → 17:00',
      idKind: 'local'
    });
    const createdCard = createdShift.locator;
    await expect(page.getByTestId('schedule-action-strip')).toContainText('LOCAL_PENDING_OFFLINE');
    await expect(page.getByTestId('calendar-local-state')).toContainText('1 pending / 0 retryable');
    await expect(dayColumn(page, offlineCreate.dayKey)).toContainText(offlineCreate.title);
    await expect(createdCard).toContainText('Local only');
    await expect(createdCard).toContainText('Pending sync');
    offlineCreateShiftId = createdShift.shiftId;

    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, offlineCreate.dayKey, null);
    await waitForShiftConflictOverlaps(page, offlineCreateShiftId, null);
    await syncCalendarFlowContext(page, flow, {
      focusShiftIds: [offlineCreateShiftId],
      note: 'offline create stored a local-only anchor shift without yet changing the visible-week conflict count'
    });
  });

  await test.step('phase: edit, move, and delete seeded shifts while offline so the moved supplier immediately creates a Friday overlap', async () => {
    flow.mark('offline-edit', offlineEdit.shiftId);
    const morningCard = shiftCard(page, offlineEdit.shiftId);
    const editDialog = morningCard.locator('details:has(summary:has-text("Edit details"))');

    await editDialog.locator('summary').click();
    await submitShiftEditorForm(editDialog, {
      title: offlineEdit.nextTitle,
      startAt: offlineEdit.nextStartLocal,
      endAt: offlineEdit.nextEndLocal
    });

    await expect(page.getByTestId('calendar-local-state')).toContainText('2 pending / 0 retryable');
    await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText(offlineEdit.nextTitle);
    await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText('09:45 → 11:45');

    flow.mark('offline-move', offlineMove.shiftId);
    const moveDialog = shiftCard(page, offlineMove.shiftId).locator('details:has(summary:has-text("Move timing"))');

    await moveDialog.locator('summary').click();
    await submitShiftEditorForm(moveDialog, {
      startAt: offlineMove.nextStartLocal,
      endAt: offlineMove.nextEndLocal
    });

    await expect(page.getByTestId('calendar-local-state')).toContainText('3 pending / 0 retryable');
    await expect(
      page.locator(`[data-testid="day-column-${offlineMove.fromDayKey}"] [data-testid="shift-card-${offlineMove.shiftId}"]`)
    ).toHaveCount(0);
    await expect(shiftCardInDay(page, offlineMove.toDayKey, offlineMove.shiftId)).toContainText(offlineMove.title);
    await expect(shiftCardInDay(page, offlineMove.toDayKey, offlineMove.shiftId)).toContainText('16:00 → 18:00');

    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, offlineMove.fromDayKey, null);
    await waitForDayConflictPairs(page, offlineMove.toDayKey, 1);
    await waitForShiftConflictOverlaps(page, offlineMove.shiftId, 1);
    if (!offlineCreateShiftId) {
      throw new Error('Expected the offline-created anchor shift id before asserting the Friday overlap.');
    }
    await waitForShiftConflictOverlaps(page, offlineCreateShiftId, 1);

    const fridayConflict = await readDayConflictSummary(page, offlineMove.toDayKey);
    expect(fridayConflict.detail).toContain(offlineCreate.title);
    expect(fridayConflict.detail).toContain(offlineMove.title);

    const movedShiftConflict = await readShiftConflictSummary(page, offlineMove.shiftId);
    expect(movedShiftConflict.detail).toContain(`${offlineCreate.title} (16:00 → 17:00)`);

    flow.mark('offline-delete', seededSchedule.deleteExpectation.shiftId);
    await shiftCard(page, seededSchedule.deleteExpectation.shiftId)
      .getByRole('button', { name: 'Delete shift' })
      .click();

    await expect(page.getByTestId('calendar-local-state')).toContainText('4 pending / 0 retryable');
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
    await expect(dayColumn(page, seededSchedule.deleteExpectation.dayKey)).not.toContainText(seededSchedule.deleteExpectation.title);
    await syncCalendarFlowContext(page, flow, {
      focusShiftIds: [offlineCreateShiftId, offlineMove.shiftId, offlineEdit.shiftId],
      note: 'offline edit, move, and delete stayed local-first while the moved supplier immediately created a new Friday overlap warning'
    });
  });

  await test.step('phase: reload again while still offline and prove the local queue plus overlap warning survive a fresh reopen', async () => {
    flow.mark('offline-reload-after-local-writes', alphaCalendarUrl);
    await page.reload();

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByTestId('calendar-route-state')).toContainText('cached-offline');
    await expect(page.getByTestId('calendar-local-state')).toContainText('offline');
    await expect(page.getByTestId('calendar-local-state')).toContainText('4 pending / 0 retryable');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Cached local board');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Offline');
    await expect(page.getByTestId('calendar-week-board')).toContainText('4 pending local writes');
    const reloadedCreatedShift = await resolveVisibleShiftCardIdentity({
      page,
      title: offlineCreate.title,
      dayKey: offlineCreate.dayKey,
      windowLabel: '16:00 → 17:00',
      idKind: 'local'
    });
    offlineCreateShiftId = reloadedCreatedShift.shiftId;
    await expect(dayColumn(page, offlineCreate.dayKey)).toContainText(offlineCreate.title);
    await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText(offlineEdit.nextTitle);
    await expect(shiftCardInDay(page, offlineMove.toDayKey, offlineMove.shiftId)).toContainText(offlineMove.title);
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);

    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, offlineMove.toDayKey, 1);
    await waitForDayConflictPairs(page, offlineMove.fromDayKey, null);
    await waitForShiftConflictOverlaps(page, offlineMove.shiftId, 1);
    if (!offlineCreateShiftId) {
      throw new Error('Expected the offline-created anchor shift id after reloading offline.');
    }
    await waitForShiftConflictOverlaps(page, offlineCreateShiftId, 1);

    const reloadedBoardConflict = await readBoardConflictSummary(page);
    expect(reloadedBoardConflict.pairCount).toBe(1);
    expect(reloadedBoardConflict.dayCount).toBe(1);

    await syncCalendarFlowContext(page, flow, {
      focusShiftIds: [offlineCreateShiftId, offlineEdit.shiftId, offlineMove.shiftId],
      note: 'offline reload preserved both the pending queue and the locally-created Friday overlap warning'
    });
  });

  await test.step('phase: direct offline navigation to the unsynced Beta calendar id still fails closed with explicit denial metadata', async () => {
    flow.mark('offline-denied-beta', betaCalendarUrl);
    await page.goto(betaCalendarUrl);

    const deniedState = page.getByTestId('access-denied-state');
    await expect(deniedState).toBeVisible();
    await expect(page.getByTestId('calendar-route-state')).toContainText('offline-denied');
    await expect(page.getByTestId('calendar-route-state')).toContainText('calendar-not-synced');
    await expect(deniedState).toContainText('calendar-missing');
    await expect(deniedState).toContainText('calendar-lookup');
    await expect(deniedState).toContainText(seededCalendars.betaShared);
    await expect(page.getByRole('link', { name: 'Return to permitted groups' })).toBeVisible();
    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.betaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: [],
      note: 'direct offline navigation to the unsynced Beta id failed closed with typed denial metadata'
    });
  });

  await test.step('phase: return to the cached Alpha route offline so reconnect can replay the queued writes in scope order', async () => {
    flow.mark('offline-return-alpha', alphaCalendarUrl);
    await page.goto(alphaCalendarUrl);

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('calendar-route-state')).toContainText('cached-offline');
    await waitForQueueSummary(page, '4 pending / 0 retryable');
    const queuedCreatedShift = await resolveVisibleShiftCardIdentity({
      page,
      title: offlineCreate.title,
      dayKey: offlineCreate.dayKey,
      windowLabel: '16:00 → 17:00',
      idKind: 'local'
    });
    offlineCreateShiftId = queuedCreatedShift.shiftId;
    await expect(dayColumn(page, offlineCreate.dayKey)).toContainText(offlineCreate.title);
    await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText(offlineEdit.nextTitle);
    await expect(shiftCardInDay(page, offlineMove.toDayKey, offlineMove.shiftId)).toContainText(offlineMove.title);
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, offlineMove.toDayKey, 1);
    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: offlineCreateShiftId ? [offlineCreateShiftId, offlineEdit.shiftId, offlineMove.shiftId] : [offlineEdit.shiftId, offlineMove.shiftId],
      note: 'returned to the cached Alpha route offline with the full pending queue and Friday overlap warning intact before reconnect'
    });
  });

  await test.step('phase: restore connectivity and prove the queued create, edit, move, and delete drain through trusted actions without losing the overlap warning', async () => {
    await setBrowserOffline(page, flow, false, 'restoring browser connectivity so the queued local writes can drain through trusted route actions');

    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await waitForSyncAttempt(page);
    await waitForQueueSummary(page, '0 pending / 0 retryable');
    await waitForSyncPhase(page, 'idle');

    await expect(page.getByTestId('calendar-local-state')).toContainText('online');
    await expect(page.getByTestId('calendar-sync-state')).toContainText('idle');
    await expect(page.getByTestId('board-sync-diagnostics')).toContainText('Last reconnect attempt:');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Server-synced board');
    await expect(page.getByTestId('calendar-week-board')).toContainText('Online');
    await expect(page.getByTestId('calendar-week-board')).toContainText('No pending local writes');
    await expect(page).toHaveURL(alphaCalendarUrl);

    const createdShift = await resolveVisibleShiftCardIdentity({
      page,
      title: offlineCreate.title,
      dayKey: offlineCreate.dayKey,
      windowLabel: '16:00 → 17:00',
      idKind: 'server'
    });
    offlineCreateShiftId = createdShift.shiftId;
    const createdCard = createdShift.locator;
    await expect(createdCard).not.toContainText('Local only');
    await expect(createdCard).not.toContainText('Pending sync');
    await expect(shiftCardInDay(page, seededSchedule.shifts.morningIntake.dayKey, offlineEdit.shiftId)).toContainText(offlineEdit.nextTitle);
    await expect(shiftCardInDay(page, offlineMove.toDayKey, offlineMove.shiftId)).toContainText(offlineMove.title);
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
    await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED');
    await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_UPDATED');
    await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_MOVED');
    await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_DELETED');

    await waitForBoardConflictPairs(page, 1);
    await waitForDayConflictPairs(page, offlineMove.toDayKey, 1);
    await waitForDayConflictPairs(page, offlineMove.fromDayKey, null);
    await waitForShiftConflictOverlaps(page, offlineMove.shiftId, 1);
    await waitForShiftConflictOverlaps(page, offlineCreateShiftId, 1);

    const reconciledFridayConflict = await readDayConflictSummary(page, offlineMove.toDayKey);
    expect(reconciledFridayConflict.detail).toContain(offlineCreate.title);
    expect(reconciledFridayConflict.detail).toContain(offlineMove.title);

    const reconciledBoardConflict = await readBoardConflictSummary(page);
    expect(reconciledBoardConflict.label).toBe('1 overlap pair in view');
    expect(reconciledBoardConflict.dayCount).toBe(1);
    expect(reconciledBoardConflict.shiftCount).toBe(2);

    await syncCalendarFlowContext(page, flow, {
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: [offlineCreateShiftId, offlineEdit.shiftId, offlineMove.shiftId],
      note: 'reconnect drained the full queued mutation stack and kept the Friday overlap warning visible after the board returned online'
    });
  });
});
