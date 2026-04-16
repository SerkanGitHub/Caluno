import type { Page } from '@playwright/test';
import {
  expect,
  openCalendarWeek,
  openTrackedCalendarSession,
  readVisibleWeekFromBoard,
  seededCalendars,
  seededSchedule,
  seededUsers,
  signInThroughUi,
  submitShiftEditorForm,
  syncCalendarFlowContext,
  test,
  waitForQueueSummary,
  waitForRealtimeChannelReady,
  waitForRemoteRefreshApplied
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const nextWeekStart = '2026-04-20';

function dayColumn(page: Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

function shiftCardsByTitle(page: Page, title: string) {
  return page.locator('[data-testid^="shift-card-"]').filter({ hasText: title });
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
    title: `Realtime propagation drill ${testInfo.retry}-${Date.now()}`,
    dayKey: '2026-04-19',
    startLocal: '2026-04-19T18:00',
    endLocal: '2026-04-19T19:00'
  } as const;

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

    await test.step('phase: prove both members are on the same scoped week with ready realtime subscriptions', async () => {
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
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [seededSchedule.shifts.morningIntake.id],
        note: 'collaborator matched the same trusted Alpha week with a ready realtime channel before the primary write'
      });
    });

    await test.step('phase: create a shared shift as the primary member without leaving the trusted week scope', async () => {
      flow.mark('primary-create-shift', syncCreate.title);
      await createOneOffShift(page, syncCreate);

      await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED');
      await waitForQueueSummary(page, '0 pending / 0 retryable');
      await expect(dayColumn(page, syncCreate.dayKey)).toContainText(syncCreate.title);
      await syncCalendarFlowContext(page, flow, {
        focusShiftIds: [],
        note: 'primary member created a unique shared shift so the collaborator page could prove live propagation without a manual reload'
      });
    });

    await test.step('phase: prove the collaborator page receives a realtime signal and refreshes the trusted week live', async () => {
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

      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(collaboratorWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(collaboratorWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [],
        note: 'collaborator page observed the shared shift live through realtime invalidation plus trusted refresh while remaining in scoped Alpha week'
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
    dayKey: '2026-04-19',
    startLocal: '2026-04-19T19:15',
    endLocal: '2026-04-19T20:00'
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
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${nextWeekStart}`);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: nextWeekStart,
        note: 'collaborator intentionally stayed on the next visible week so realtime scope guards remain testable'
      });
    });

    await test.step('phase: create a current-week shift and prove the next-week collaborator does not mis-scope a refresh', async () => {
      flow.mark('primary-create-current-week', scopedCreate.title);
      await createOneOffShift(page, scopedCreate);

      await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED');
      await waitForQueueSummary(page, '0 pending / 0 retryable');
      await expect(dayColumn(page, scopedCreate.dayKey)).toContainText(scopedCreate.title);

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
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${nextWeekStart}`);

      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(collaboratorWeek.visibleWeekStart).toBe(nextWeekStart);
      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: nextWeekStart,
        note: 'out-of-scope collaborator view stayed on the next week and ignored the current-week realtime write as expected'
      });
    });
  } finally {
    await collaborator.close();
  }
});
