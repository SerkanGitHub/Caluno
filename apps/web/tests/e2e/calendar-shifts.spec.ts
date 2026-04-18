import {
  expect,
  expectedCreateShiftPrefillValues,
  openCalendarWeek,
  openFindTimeRoute,
  readBoardConflictSummary,
  readCreateShiftPrefillSnapshot,
  readDayConflictSummary,
  readFindTimeBrowseWindowCtaSnapshot,
  readShiftConflictSummary,
  readVisibleWeekFromBoard,
  seededCalendars,
  seededFindTime,
  seededSchedule,
  seededUsers,
  signInThroughUi,
  submitShiftEditorForm,
  syncCalendarFlowContext,
  test,
  waitForDayConflictPairs,
  waitForShiftConflictOverlaps
} from './fixtures';

test.describe.configure({ mode: 'serial' });

function dayColumn(page: import('@playwright/test').Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

test('seeded member can prove the trusted-online Thursday overlap warning while the Wednesday touch boundary stays clean', async ({
  page,
  flow
}) => {
  await test.step('phase: sign in and open the deterministic seeded week', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
    await expect(page.getByRole('heading', { name: seededUsers.alphaMember.expectedGroups[0] })).toBeVisible();

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
      phase: 'open-seeded-week'
    });

    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('schedule-load-state')).toHaveCount(0);
  });

  await test.step('phase: prove same-day multi-shift state is visible on load, including the seeded Thursday overlap and clean Wednesday boundary', async () => {
    flow.mark('verify-seeded-load', seededSchedule.visibleWeek.start);
    flow.setContext({
      note: 'verifying seeded same-day multi-shift load plus conflict visibility',
      focusShiftIds: [
        seededSchedule.shifts.alphaOpeningSweepWednesday.id,
        seededSchedule.shifts.morningIntake.id,
        seededSchedule.shifts.afternoonHandoff.id,
        seededSchedule.shifts.alphaOpeningSweepThursday.id,
        seededSchedule.shifts.kitchenPrep.id,
        seededSchedule.shifts.supplierCall.id
      ]
    });

    const visibleWeek = await readVisibleWeekFromBoard(page);
    expect(visibleWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
    expect(visibleWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

    const wednesdayColumn = dayColumn(page, '2026-04-15');
    await expect(wednesdayColumn.locator('[data-testid^="shift-card-"]')).toHaveCount(3);
    await expect(wednesdayColumn).toContainText('Alpha opening sweep');
    await expect(wednesdayColumn).toContainText('Morning intake');
    await expect(wednesdayColumn).toContainText('Afternoon handoff');

    const thursdayColumn = dayColumn(page, '2026-04-16');
    await expect(thursdayColumn.locator('[data-testid^="shift-card-"]')).toHaveCount(3);
    await expect(thursdayColumn).toContainText('Alpha opening sweep');
    await expect(thursdayColumn).toContainText('Kitchen prep');
    await expect(thursdayColumn).toContainText('Supplier call');

    const boardConflict = await readBoardConflictSummary(page);
    expect(boardConflict.visible).toBe(true);
    expect(boardConflict.label).toBe('1 overlap pair in view');
    expect(boardConflict.dayCount).toBe(1);
    expect(boardConflict.shiftCount).toBe(2);
    expect(boardConflict.pairCount).toBe(1);

    const thursdayConflict = await readDayConflictSummary(page, '2026-04-16');
    expect(thursdayConflict.visible).toBe(true);
    expect(thursdayConflict.label).toBe('1 overlap pair');
    expect(thursdayConflict.shiftCount).toBe(2);
    expect(thursdayConflict.pairCount).toBe(1);
    expect(thursdayConflict.detail).toContain('Kitchen prep');
    expect(thursdayConflict.detail).toContain('Supplier call');

    await waitForDayConflictPairs(page, '2026-04-15', null);
    const wednesdayConflict = await readDayConflictSummary(page, '2026-04-15');
    expect(wednesdayConflict.visible).toBe(false);

    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.kitchenPrep.id, 1);
    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.supplierCall.id, 1);
    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.alphaOpeningSweepWednesday.id, null);
    await waitForShiftConflictOverlaps(page, seededSchedule.shifts.morningIntake.id, null);

    const kitchenConflict = await readShiftConflictSummary(page, seededSchedule.shifts.kitchenPrep.id);
    expect(kitchenConflict.label).toBe('Overlaps 1 visible shift');
    expect(kitchenConflict.detail).toContain('Supplier call (13:00 → 15:00)');

    const supplierConflict = await readShiftConflictSummary(page, seededSchedule.shifts.supplierCall.id);
    expect(supplierConflict.label).toBe('Overlaps 1 visible shift');
    expect(supplierConflict.detail).toContain('Kitchen prep (12:00 → 14:00)');

    await syncCalendarFlowContext(page, flow, {
      note: 'seeded Thursday overlap remained visible at board, day, and card level while the Wednesday touch boundary stayed clean'
    });
  });
});

test('browse suggestion handoff creates a visible shift on the intended day and does not reopen after reload', async ({ page, flow }) => {
  const createdTitle = 'Find time browse handoff';

  await test.step('phase: sign in and open the truthful find-time route for the permitted Alpha calendar', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await openFindTimeRoute({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      durationMinutes: seededFindTime.durationMinutes,
      start: seededFindTime.start,
      phase: 'find-time-browse-create'
    });

    await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('find-time-browse-window-2-cta')).toBeVisible();
  });

  let browseSuggestion: Awaited<ReturnType<typeof readFindTimeBrowseWindowCtaSnapshot>> | null = null;

  await test.step('phase: click the real browse suggestion CTA and verify the board lands on its exact prefill window', async () => {
    browseSuggestion = await readFindTimeBrowseWindowCtaSnapshot(page, 2);
    const expectedPrefillValues = expectedCreateShiftPrefillValues(browseSuggestion);

    flow.mark('click-browse-suggestion', browseSuggestion.href ?? 'missing-href');
    await page.getByTestId('find-time-browse-window-2-cta').click();

    await expect(page.getByTestId('calendar-shell')).toBeVisible();

    const visibleWeek = await readVisibleWeekFromBoard(page);
    expect(visibleWeek.visibleWeekStart).toBe(browseSuggestion.targetWeekStart);

    const prefill = await readCreateShiftPrefillSnapshot(page);
    expect(prefill.open).toBe(true);
    expect(prefill.openOnArrival).toBe('true');
    expect(prefill.createSource).toBe('find-time');
    expect(prefill.prefillSource).toBe('find-time');
    expect(prefill.prefillStart).toBe(browseSuggestion.startAt);
    expect(prefill.prefillEnd).toBe(browseSuggestion.endAt);
    expect(prefill.startValue).toBe(expectedPrefillValues.startValue);
    expect(prefill.endValue).toBe(expectedPrefillValues.endValue);

    await expect
      .poll(() => page.url(), {
        message: 'expected the calendar destination URL to stay clean after the browse suggestion handoff'
      })
      .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${browseSuggestion.targetWeekStart}`);
  });

  await test.step('phase: submit the existing create dialog and verify the new shift is visible on the chosen board day', async () => {
    if (!browseSuggestion) {
      throw new Error('Expected the browse suggestion handoff snapshot before submitting the create dialog.');
    }

    const editor = page.getByTestId('create-shift-editor');
    await submitShiftEditorForm(editor, { title: createdTitle });

    const targetDayKey = (browseSuggestion.startAt ?? '').slice(0, 10);
    const targetDayColumn = page.getByTestId(`day-column-${targetDayKey}`);

    await expect(targetDayColumn).toContainText(createdTitle);
    await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();
  });

  await test.step('phase: reload the board and prove the created shift remains visible without reopening the handoff', async () => {
    if (!browseSuggestion) {
      throw new Error('Expected the browse suggestion handoff snapshot before verifying reload behavior.');
    }

    await page.reload();

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByTestId('create-shift-editor')).toHaveAttribute('data-open-on-arrival', 'false');
    await expect(page.getByTestId('create-prefill-source')).toHaveCount(0);
    await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();

    await expect
      .poll(() => page.url(), {
        message: 'expected reload to keep the cleaned calendar URL instead of restoring one-shot handoff params'
      })
      .toBe(`http://127.0.0.1:4174/calendars/${seededCalendars.alphaShared}?start=${browseSuggestion.targetWeekStart}`);
  });
});

test('seeded member still gets the explicit denied surface for an unauthorized calendar route', async ({ page, flow }) => {
  await test.step('phase: sign in as the Alpha member', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);
    await expect(page.getByTestId('groups-shell')).toContainText('trusted-online');
  });

  await test.step('phase: navigate directly to the unauthorized Beta calendar id and keep the denial metadata visible', async () => {
    flow.mark('access-denied', seededCalendars.betaShared);
    flow.setContext({
      calendarId: seededCalendars.betaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      visibleWeekEndExclusive: seededSchedule.visibleWeek.endExclusive,
      focusShiftIds: [],
      note: 'verifying unauthorized calendar route still renders the denied state'
    });

    await page.goto(`/calendars/${seededCalendars.betaShared}?start=${seededSchedule.visibleWeek.start}`);

    const deniedState = page.getByTestId('access-denied-state');
    await expect(deniedState).toBeVisible();
    await expect(deniedState).toContainText('calendar-missing');
    await expect(deniedState).toContainText('calendar-lookup');
    await expect(deniedState).toContainText(seededCalendars.betaShared);
    await expect(page.getByRole('link', { name: 'Return to permitted groups' })).toBeVisible();
  });
});
