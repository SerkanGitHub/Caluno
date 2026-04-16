import type { Page } from '@playwright/test';
import {
  expect,
  openCalendarWeek,
  openTrackedCalendarSession,
  readBoardConflictSummary,
  readDayConflictSummary,
  readShiftConflictSummary,
  readVisibleWeekFromBoard,
  seededCalendars,
  seededSchedule,
  seededUsers,
  signInThroughUi,
  submitShiftEditorForm,
  syncCalendarFlowContext,
  test,
  waitForBoardConflictPairs,
  waitForDayConflictPairs,
  waitForQueueSummary,
  waitForRealtimeChannelReady,
  waitForRemoteRefreshApplied,
  waitForShiftConflictOverlaps
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const nextWeekStart = '2026-04-20';

function dayColumn(page: Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

function shiftCardsByTitle(page: Page, title: string) {
  return page.locator('[data-testid^="shift-card-"]').filter({ hasText: title });
}

async function readShiftIdFromCard(card: ReturnType<typeof shiftCardsByTitle>) {
  const testId = await card.first().getAttribute('data-testid');
  if (!testId) {
    throw new Error('Expected the created realtime shift card to expose a data-testid.');
  }

  return testId.replace('shift-card-', '');
}

async function createOneOffShift(
  page: Page,
  params: {
    title: string;
    startLocal: string;
    endLocal: string;
  }
) {
  const createDialog = page.locator('details.shift-editor--create');

  await createDialog.locator('summary').click();
  await submitShiftEditorForm(createDialog, {
    title: params.title,
    startAt: params.startLocal,
    endAt: params.endLocal,
    recurrenceCadence: ''
  });
}

test('online collaborators see shared shift changes propagate live within the same trusted calendar week', async (
  { browser, page, flow },
  testInfo
) => {
  const collaborator = await openTrackedCalendarSession({
    browser,
    testInfo,
    attachmentName: 'flow-diagnostics-collaborator',
    user: seededUsers.alphaCollaborator,
    calendarId: seededCalendars.alphaShared,
    visibleWeekStart: seededSchedule.visibleWeek.start,
    focusShiftIds: [seededSchedule.shifts.morningIntake.id]
  });
  const syncCreate = {
    title: `Realtime overlap drill ${testInfo.retry}-${Date.now()}`,
    dayKey: '2026-04-16',
    startLocal: '2026-04-16T13:30',
    endLocal: '2026-04-16T14:30'
  } as const;
  let syncCreateShiftId: string | null = null;

  try {
    await test.step('phase: sign in the primary member and open the shared Alpha calendar week', async () => {
      flow.mark('login', seededUsers.alphaMember.email);
      await signInThroughUi(page, seededUsers.alphaMember);
      await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');

      await openCalendarWeek({
        page,
        flow,
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        focusShiftIds: [seededSchedule.shifts.morningIntake.id],
        phase: 'open-primary-alpha-week'
      });

      await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
      await expect(page.getByTestId('calendar-route-state')).toContainText('trusted-online');
      await waitForQueueSummary(page, '0 pending / 0 retryable');
      await syncCalendarFlowContext(page, flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [seededSchedule.shifts.morningIntake.id],
        note: 'primary member opened the trusted shared calendar week for realtime collaborator proof'
      });
    });

    await test.step('phase: prove both members are on the same scoped week with ready realtime subscriptions and the same seeded Thursday conflict baseline', async () => {
      await expect(collaborator.page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
      await expect(collaborator.page.getByTestId('calendar-route-state')).toContainText('trusted-online');
      await waitForQueueSummary(collaborator.page, '0 pending / 0 retryable');
      await waitForRealtimeChannelReady(page);
      await waitForRealtimeChannelReady(collaborator.page);

      const primaryWeek = await readVisibleWeekFromBoard(page);
      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(primaryWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(primaryWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
      expect(collaboratorWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(collaboratorWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

      await expect(page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`);
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`);
      await waitForBoardConflictPairs(page, 1);
      await waitForBoardConflictPairs(collaborator.page, 1);
      await waitForDayConflictPairs(page, '2026-04-16', 1);
      await waitForDayConflictPairs(collaborator.page, '2026-04-16', 1);
      await waitForShiftConflictOverlaps(page, seededSchedule.shifts.kitchenPrep.id, 1);
      await waitForShiftConflictOverlaps(collaborator.page, seededSchedule.shifts.supplierCall.id, 1);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
        note: 'collaborator matched the same trusted Alpha week with a ready realtime channel and the seeded Thursday conflict baseline before the primary write'
      });
    });

    await test.step('phase: create a shared overlapping shift as the primary member without leaving the trusted week scope', async () => {
      flow.mark('primary-create-shift', syncCreate.title);
      await createOneOffShift(page, syncCreate);

      await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED');
      await waitForQueueSummary(page, '0 pending / 0 retryable');
      await expect(dayColumn(page, syncCreate.dayKey)).toContainText(syncCreate.title);
      syncCreateShiftId = await readShiftIdFromCard(shiftCardsByTitle(page, syncCreate.title));
      await waitForBoardConflictPairs(page, 3);
      await waitForDayConflictPairs(page, syncCreate.dayKey, 3);
      await waitForShiftConflictOverlaps(page, syncCreateShiftId, 2);
      await syncCalendarFlowContext(page, flow, {
        focusShiftIds: [syncCreateShiftId, seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
        note: 'primary member created a shared overlapping shift so the collaborator page could prove live conflict propagation without a manual reload'
      });
    });

    await test.step('phase: prove the collaborator page receives a realtime signal and refreshes the trusted week live with the new overlap warning', async () => {
      collaborator.flow.mark('await-realtime-refresh', syncCreate.title);
      await waitForRemoteRefreshApplied(collaborator.page);
      await expect(collaborator.page.getByTestId('calendar-realtime-state')).toHaveAttribute('data-channel-state', 'ready');
      await expect(collaborator.page.getByTestId('calendar-realtime-state')).toContainText('Last signal');
      await waitForQueueSummary(collaborator.page, '0 pending / 0 retryable');
      await expect(dayColumn(collaborator.page, syncCreate.dayKey)).toContainText(syncCreate.title);
      await expect(shiftCardsByTitle(collaborator.page, syncCreate.title)).toHaveCount(1);
      await expect(collaborator.page.getByTestId('calendar-week-board')).toContainText('Server-synced board');
      await expect(collaborator.page.getByTestId('calendar-week-board')).toContainText('Online');
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`);

      if (!syncCreateShiftId) {
        syncCreateShiftId = await readShiftIdFromCard(shiftCardsByTitle(collaborator.page, syncCreate.title));
      }
      await waitForBoardConflictPairs(collaborator.page, 3);
      await waitForDayConflictPairs(collaborator.page, syncCreate.dayKey, 3);
      await waitForShiftConflictOverlaps(collaborator.page, syncCreateShiftId, 2);
      await waitForShiftConflictOverlaps(collaborator.page, seededSchedule.shifts.kitchenPrep.id, 2);
      await waitForShiftConflictOverlaps(collaborator.page, seededSchedule.shifts.supplierCall.id, 2);

      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(collaboratorWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(collaboratorWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

      const collaboratorBoardConflict = await readBoardConflictSummary(collaborator.page);
      expect(collaboratorBoardConflict.label).toBe('3 overlap pairs in view');
      expect(collaboratorBoardConflict.dayCount).toBe(1);
      expect(collaboratorBoardConflict.shiftCount).toBe(3);

      const collaboratorDayConflict = await readDayConflictSummary(collaborator.page, syncCreate.dayKey);
      expect(collaboratorDayConflict.detail).toContain('Kitchen prep');
      expect(collaboratorDayConflict.detail).toContain('Supplier call');
      expect(collaboratorDayConflict.detail).toContain(syncCreate.title);

      const collaboratorShiftConflict = await readShiftConflictSummary(collaborator.page, syncCreateShiftId);
      expect(collaboratorShiftConflict.label).toBe('Overlaps 2 visible shifts');
      expect(collaboratorShiftConflict.detail).toContain('Kitchen prep (12:00 → 14:00)');
      expect(collaboratorShiftConflict.detail).toContain('Supplier call (13:00 → 15:00)');

      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [syncCreateShiftId, seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
        note: 'collaborator page observed the new overlap warning live through realtime invalidation plus trusted refresh while remaining in scoped Alpha week'
      });
    });
  } finally {
    await collaborator.close();
  }
});

test('realtime refreshes stay scoped when a collaborator is viewing a different visible week', async (
  { browser, page, flow },
  testInfo
) => {
  const collaborator = await openTrackedCalendarSession({
    browser,
    testInfo,
    attachmentName: 'flow-diagnostics-collaborator-next-week',
    user: seededUsers.alphaCollaborator,
    calendarId: seededCalendars.alphaShared,
    visibleWeekStart: nextWeekStart,
    focusShiftIds: []
  });
  const scopedCreate = {
    title: `Realtime scope guard ${testInfo.retry}-${Date.now()}`,
    dayKey: '2026-04-16',
    startLocal: '2026-04-16T13:30',
    endLocal: '2026-04-16T14:30'
  } as const;

  try {
    await test.step('phase: open the current Alpha week for the writer while the collaborator stays on the next week', async () => {
      flow.mark('login', seededUsers.alphaMember.email);
      await signInThroughUi(page, seededUsers.alphaMember);
      await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');

      await openCalendarWeek({
        page,
        flow,
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        focusShiftIds: [],
        phase: 'open-primary-current-week'
      });

      await waitForRealtimeChannelReady(page);
      await waitForRealtimeChannelReady(collaborator.page);
      await waitForBoardConflictPairs(page, 1);
      await waitForBoardConflictPairs(collaborator.page, null);
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${nextWeekStart}`);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: nextWeekStart,
        note: 'collaborator intentionally stayed on the next visible week so realtime scope guards remain testable and conflict-free'
      });
    });

    await test.step('phase: create a current-week overlap and prove the next-week collaborator does not mis-scope a refresh', async () => {
      flow.mark('primary-create-current-week', scopedCreate.title);
      await createOneOffShift(page, scopedCreate);

      await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED');
      await waitForQueueSummary(page, '0 pending / 0 retryable');
      await expect(dayColumn(page, scopedCreate.dayKey)).toContainText(scopedCreate.title);
      await waitForBoardConflictPairs(page, 3);
      await waitForDayConflictPairs(page, scopedCreate.dayKey, 3);

      await expect
        .poll(async () => await shiftCardsByTitle(collaborator.page, scopedCreate.title).count(), {
          timeout: 8_000,
          message: 'expected the next-week collaborator to keep ignoring a current-week write'
        })
        .toBe(0);
      await expect
        .poll(async () => collaborator.page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'), {
          timeout: 8_000,
          message: 'expected the next-week collaborator to avoid a remote refresh for an out-of-scope write'
        })
        .toBe('idle');
      await waitForBoardConflictPairs(collaborator.page, null);
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${nextWeekStart}`);

      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(collaboratorWeek.visibleWeekStart).toBe(nextWeekStart);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: nextWeekStart,
        note: 'out-of-scope collaborator view stayed on the next week, kept its clean conflict state, and ignored the current-week realtime overlap write as expected'
      });
    });
  } finally {
    await collaborator.close();
  }
});
