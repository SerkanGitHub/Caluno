import type { Page } from '@playwright/test';
import {
  expect,
  openCalendarWeek,
  openTrackedCalendarSession,
  readBoardConflictSummary,
  readDayConflictSummary,
  readShiftConflictSummary,
  readVisibleWeekFromBoard,
  resolveVisibleShiftCardIdentity,
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
  waitForRemoteRefreshState,
  waitForShiftConflictOverlaps
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const nextWeekStart = '2026-04-20';
const offlineOverlapAnchorTitle = 'Offline continuity overlap anchor';

type SharedOverlapScenario = {
  dayKey: string;
  startLocal: string;
  endLocal: string;
  expectedExistingShiftIds: string[];
  expectedExistingShiftDetails: string[];
  expectedDayDetailFragments: string[];
};

function dayColumn(page: Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

function shiftCardsByTitle(page: Page, title: string) {
  return page.locator('[data-testid^="shift-card-"]').filter({ hasText: title });
}

function overlapPairsLabel(pairCount: number) {
  return `${pairCount} overlap pair${pairCount === 1 ? '' : 's'} in view`;
}

async function detectSharedOverlapScenario(page: Page): Promise<SharedOverlapScenario> {
  const thursdayConflict = await readDayConflictSummary(page, '2026-04-16');

  if (thursdayConflict.pairCount === 1 && thursdayConflict.shiftCount === 2) {
    return {
      dayKey: '2026-04-16',
      startLocal: '2026-04-16T13:30',
      endLocal: '2026-04-16T14:30',
      expectedExistingShiftIds: [seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
      expectedExistingShiftDetails: ['Kitchen prep (12:00 → 14:00)', 'Supplier call (13:00 → 15:00)'],
      expectedDayDetailFragments: ['Kitchen prep', 'Supplier call']
    };
  }

  const fridayConflict = await readDayConflictSummary(page, '2026-04-17');

  if (fridayConflict.pairCount === 1 && fridayConflict.shiftCount === 2) {
    const offlineAnchor = await resolveVisibleShiftCardIdentity({
      page,
      title: offlineOverlapAnchorTitle,
      dayKey: '2026-04-17',
      idKind: 'server'
    });

    return {
      dayKey: '2026-04-17',
      startLocal: '2026-04-17T16:15',
      endLocal: '2026-04-17T16:45',
      expectedExistingShiftIds: [seededSchedule.shifts.supplierCall.id, offlineAnchor.shiftId],
      expectedExistingShiftDetails: ['Supplier call (16:00 → 18:00)', `${offlineOverlapAnchorTitle} (16:00 → 17:00)`],
      expectedDayDetailFragments: ['Supplier call', offlineOverlapAnchorTitle]
    };
  }

  throw new Error(
    'Expected the visible trusted week to expose either the seeded Thursday overlap baseline or the post-offline Friday overlap baseline before starting the realtime collaborator proof.'
  );
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
  let syncCreateShiftId: string | null = null;
  let syncCreateTitle: string | null = null;
  let sharedOverlapScenario: SharedOverlapScenario | null = null;
  let baselineBoardPairCount = 0;
  let baselineDayPairCount = 0;

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

    await test.step('phase: prove both members are on the same scoped week with ready realtime subscriptions and a shared visible overlap baseline', async () => {
      await expect(collaborator.page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
      await expect(collaborator.page.getByTestId('calendar-route-state')).toContainText('trusted-online');
      await waitForQueueSummary(collaborator.page, '0 pending / 0 retryable');
      await waitForRealtimeChannelReady(page);
      await waitForRealtimeChannelReady(collaborator.page);
      await waitForRemoteRefreshState(page, 'idle');
      await waitForRemoteRefreshState(collaborator.page, 'idle');

      const primaryWeek = await readVisibleWeekFromBoard(page);
      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(primaryWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(primaryWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);
      expect(collaboratorWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(collaboratorWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

      await expect(page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`);
      await expect(collaborator.page).toHaveURL(
        `/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`
      );

      const primaryBoardConflict = await readBoardConflictSummary(page);
      const collaboratorBoardConflict = await readBoardConflictSummary(collaborator.page);
      baselineBoardPairCount = primaryBoardConflict.pairCount ?? 0;
      expect(baselineBoardPairCount).toBeGreaterThan(0);
      expect(collaboratorBoardConflict.pairCount).toBe(baselineBoardPairCount);

      sharedOverlapScenario = await detectSharedOverlapScenario(page);
      const collaboratorScenario = await detectSharedOverlapScenario(collaborator.page);
      expect(collaboratorScenario.dayKey).toBe(sharedOverlapScenario.dayKey);
      expect(collaboratorScenario.expectedExistingShiftIds).toEqual(sharedOverlapScenario.expectedExistingShiftIds);

      baselineDayPairCount = (await readDayConflictSummary(page, sharedOverlapScenario.dayKey)).pairCount ?? 0;
      expect((await readDayConflictSummary(collaborator.page, sharedOverlapScenario.dayKey)).pairCount).toBe(baselineDayPairCount);

      await waitForBoardConflictPairs(page, baselineBoardPairCount);
      await waitForBoardConflictPairs(collaborator.page, baselineBoardPairCount);
      await waitForDayConflictPairs(page, sharedOverlapScenario.dayKey, baselineDayPairCount);
      await waitForDayConflictPairs(collaborator.page, sharedOverlapScenario.dayKey, baselineDayPairCount);

      for (const shiftId of sharedOverlapScenario.expectedExistingShiftIds) {
        await waitForShiftConflictOverlaps(page, shiftId, 1);
        await waitForShiftConflictOverlaps(collaborator.page, shiftId, 1);
      }

      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: sharedOverlapScenario.expectedExistingShiftIds,
        note: `collaborator matched the same trusted Alpha week with a ready realtime channel and the ${sharedOverlapScenario.dayKey} overlap baseline before the primary write`
      });
    });

    await test.step('phase: create a shared overlapping shift as the primary member without leaving the trusted week scope', async () => {
      if (!sharedOverlapScenario) {
        throw new Error('Expected a shared overlap scenario before creating the realtime proof shift.');
      }

      const syncCreate = {
        title: `Realtime overlap drill ${testInfo.retry}-${Date.now()}`,
        dayKey: sharedOverlapScenario.dayKey,
        startLocal: sharedOverlapScenario.startLocal,
        endLocal: sharedOverlapScenario.endLocal
      } as const;

      flow.mark('primary-create-shift', syncCreate.title);
      syncCreateTitle = syncCreate.title;
      await createOneOffShift(page, syncCreate);

      await waitForQueueSummary(page, '0 pending / 0 retryable');
      const createdShift = await resolveVisibleShiftCardIdentity({
        page,
        title: syncCreate.title,
        dayKey: syncCreate.dayKey,
        idKind: 'server'
      });
      syncCreateShiftId = createdShift.shiftId;
      await expect(createdShift.locator).toBeVisible();
      await waitForBoardConflictPairs(page, baselineBoardPairCount + 2);
      await waitForDayConflictPairs(page, syncCreate.dayKey, baselineDayPairCount + 2);
      await waitForShiftConflictOverlaps(page, syncCreateShiftId, 2);

      for (const shiftId of sharedOverlapScenario.expectedExistingShiftIds) {
        await waitForShiftConflictOverlaps(page, shiftId, 2);
      }

      await syncCalendarFlowContext(page, flow, {
        focusShiftIds: [syncCreateShiftId, ...sharedOverlapScenario.expectedExistingShiftIds],
        note: 'primary member created a shared overlapping shift so the collaborator page could prove live conflict propagation without a manual reload'
      });
    });

    await test.step('phase: prove the collaborator page receives a realtime signal and refreshes the trusted week live with the new overlap warning', async () => {
      if (!sharedOverlapScenario) {
        throw new Error('Expected a shared overlap scenario before asserting collaborator realtime refresh.');
      }
      if (!syncCreateShiftId) {
        throw new Error('Expected the primary create shift id before asserting collaborator realtime refresh.');
      }

      if (!syncCreateTitle) {
        throw new Error('Expected the primary create shift title before asserting collaborator realtime refresh.');
      }

      collaborator.flow.mark('await-realtime-refresh', syncCreateShiftId);
      await collaborator.page.bringToFront();
      await waitForRemoteRefreshApplied(collaborator.page);
      await expect(collaborator.page.getByTestId('calendar-realtime-state')).toHaveAttribute('data-channel-state', 'ready');
      await expect(collaborator.page.getByTestId('calendar-realtime-state')).toHaveAttribute(
        'data-remote-refresh-state',
        'applied'
      );
      await waitForQueueSummary(collaborator.page, '0 pending / 0 retryable');

      const collaboratorShift = await resolveVisibleShiftCardIdentity({
        page: collaborator.page,
        title: syncCreateTitle,
        dayKey: sharedOverlapScenario.dayKey,
        idKind: 'server'
      });
      await expect(collaboratorShift.locator).toBeVisible();
      expect(collaboratorShift.shiftId).toBe(syncCreateShiftId);

      await expect(collaborator.page.getByTestId('calendar-week-board')).toContainText('Server-synced board');
      await expect(collaborator.page.getByTestId('calendar-week-board')).toContainText('Online');
      await expect(collaborator.page).toHaveURL(`/calendars/${seededCalendars.alphaShared}?start=${seededSchedule.visibleWeek.start}`);
      await waitForBoardConflictPairs(collaborator.page, baselineBoardPairCount + 2);
      await waitForDayConflictPairs(collaborator.page, sharedOverlapScenario.dayKey, baselineDayPairCount + 2);
      await waitForShiftConflictOverlaps(collaborator.page, syncCreateShiftId, 2);

      for (const shiftId of sharedOverlapScenario.expectedExistingShiftIds) {
        await waitForShiftConflictOverlaps(collaborator.page, shiftId, 2);
      }

      const collaboratorWeek = await readVisibleWeekFromBoard(collaborator.page);
      expect(collaboratorWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
      expect(collaboratorWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

      const collaboratorBoardConflict = await readBoardConflictSummary(collaborator.page);
      expect(collaboratorBoardConflict.label).toBe(overlapPairsLabel(baselineBoardPairCount + 2));
      expect(collaboratorBoardConflict.dayCount).toBe(1);
      expect(collaboratorBoardConflict.shiftCount).toBe(3);

      const collaboratorDayConflict = await readDayConflictSummary(collaborator.page, sharedOverlapScenario.dayKey);
      expect(collaboratorDayConflict.pairCount).toBe(baselineDayPairCount + 2);
      expect(collaboratorDayConflict.shiftCount).toBe(3);
      for (const fragment of sharedOverlapScenario.expectedDayDetailFragments) {
        expect(collaboratorDayConflict.detail).toContain(fragment);
      }

      const collaboratorShiftConflict = await readShiftConflictSummary(collaborator.page, syncCreateShiftId);
      expect(collaboratorShiftConflict.label).toBe('Overlaps 2 visible shifts');
      for (const detail of sharedOverlapScenario.expectedExistingShiftDetails) {
        expect(collaboratorShiftConflict.detail).toContain(detail);
      }

      await syncCalendarFlowContext(collaborator.page, collaborator.flow, {
        calendarId: seededCalendars.alphaShared,
        visibleWeekStart: seededSchedule.visibleWeek.start,
        visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
        focusShiftIds: [syncCreateShiftId, ...sharedOverlapScenario.expectedExistingShiftIds],
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
  let currentWeekBaselinePairCount = 0;
  let currentWeekDayBaselinePairCount = 0;

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
      await waitForRemoteRefreshState(page, 'idle');
      await waitForRemoteRefreshState(collaborator.page, 'idle');
      currentWeekBaselinePairCount = (await readBoardConflictSummary(page)).pairCount ?? 0;
      currentWeekDayBaselinePairCount = (await readDayConflictSummary(page, scopedCreate.dayKey)).pairCount ?? 0;
      expect(currentWeekBaselinePairCount).toBeGreaterThan(0);
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

      await waitForQueueSummary(page, '0 pending / 0 retryable');
      const createdShift = await resolveVisibleShiftCardIdentity({
        page,
        title: scopedCreate.title,
        dayKey: scopedCreate.dayKey,
        idKind: 'server'
      });
      await expect(createdShift.locator).toBeVisible();
      await expect
        .poll(async () => (await readBoardConflictSummary(page)).pairCount ?? 0, {
          timeout: 20_000,
          message: 'expected the writer board conflict count to increase after the current-week overlap create'
        })
        .toBeGreaterThan(currentWeekBaselinePairCount);
      await expect
        .poll(async () => (await readDayConflictSummary(page, scopedCreate.dayKey)).pairCount ?? 0, {
          timeout: 20_000,
          message: `expected ${scopedCreate.dayKey} conflict pairs to increase after the current-week overlap create`
        })
        .toBeGreaterThan(currentWeekDayBaselinePairCount);

      await expect
        .poll(async () => await shiftCardsByTitle(collaborator.page, scopedCreate.title).count(), {
          timeout: 8_000,
          message: 'expected the next-week collaborator to keep ignoring a current-week write'
        })
        .toBe(0);
      await waitForRemoteRefreshState(collaborator.page, 'idle', 8_000);
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
