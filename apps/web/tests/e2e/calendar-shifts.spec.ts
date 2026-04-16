import {
  expect,
  openCalendarWeek,
  readVisibleWeekFromBoard,
  seededCalendars,
  seededSchedule,
  seededUsers,
  signInThroughUi,
  submitShiftEditorForm,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

function dayColumn(page: import('@playwright/test').Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

function shiftCard(page: import('@playwright/test').Page, shiftId: string) {
  return page.getByTestId(`shift-card-${shiftId}`);
}

function shiftCardInDay(page: import('@playwright/test').Page, dayKey: string, shiftId: string) {
  return dayColumn(page, dayKey).getByTestId(`shift-card-${shiftId}`);
}

test('seeded member can prove multi-shift load plus recurring create, edit, move, delete, and reload continuity', async ({
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

  await test.step('phase: prove same-day multi-shift state is visible on load', async () => {
    flow.mark('verify-seeded-load', seededSchedule.visibleWeek.start);
    flow.setContext({
      note: 'verifying seeded same-day multi-shift load',
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
  });

  await test.step('phase: fail a bounded recurring create once, then create concrete occurrences across the visible week', async () => {
    flow.mark('create-recurring-validation', seededSchedule.recurringCreate.title);
    flow.setContext({
      note: 'provoking create validation error before successful bounded recurrence',
      focusShiftIds: []
    });

    const createDialog = page.locator('details.shift-editor--create');
    await createDialog.locator('summary').click();
    await submitShiftEditorForm(createDialog, {
      title: seededSchedule.recurringCreate.title,
      startAt: seededSchedule.recurringCreate.startLocal,
      endAt: seededSchedule.recurringCreate.endLocal,
      recurrenceCadence: 'daily',
      repeatCount: '',
      repeatUntil: ''
    });

    const createState = page.getByTestId('create-state');
    await expect(page.locator('[data-testid^="shift-card-"] h3').filter({ hasText: seededSchedule.recurringCreate.title })).toHaveCount(0);
    if ((await createState.count()) > 0) {
      await expect(createState).toBeVisible();
      await expect(createState).toContainText('RECURRENCE_BOUND_REQUIRED');
    }

    flow.mark('create-recurring-success', seededSchedule.recurringCreate.title);
    await submitShiftEditorForm(createDialog, {
      title: seededSchedule.recurringCreate.title,
      startAt: seededSchedule.recurringCreate.startLocal,
      endAt: seededSchedule.recurringCreate.endLocal,
      recurrenceCadence: 'daily',
      repeatCount: seededSchedule.recurringCreate.repeatCount
    });

    const actionStrip = page.getByTestId('schedule-action-strip');
    if ((await actionStrip.count()) > 0) {
      await expect.poll(async () => (await actionStrip.textContent()) ?? '').toContain('Create shift');
    }

    for (const dayKey of seededSchedule.recurringCreate.expectedDayKeys) {
      await expect(dayColumn(page, dayKey)).toContainText(seededSchedule.recurringCreate.title);
    }

    await expect(page.locator('[data-testid^="shift-card-"] h3').filter({ hasText: seededSchedule.recurringCreate.title })).toHaveCount(
      seededSchedule.recurringCreate.expectedDayKeys.length
    );
  });

  await test.step('phase: edit a seeded shift in place and surface the trusted edit state', async () => {
    flow.mark('edit-shift', seededSchedule.editExpectation.shiftId);
    flow.setContext({
      note: 'editing a seeded one-off shift in place',
      focusShiftIds: [seededSchedule.editExpectation.shiftId]
    });

    const morningCard = shiftCard(page, seededSchedule.editExpectation.shiftId);
    const editDialog = morningCard.locator('details:has(summary:has-text("Edit details"))');

    await editDialog.locator('summary').click();
    await submitShiftEditorForm(editDialog, {
      title: seededSchedule.editExpectation.nextTitle,
      startAt: seededSchedule.editExpectation.nextStartLocal,
      endAt: seededSchedule.editExpectation.nextEndLocal
    });

    const actionStrip = page.getByTestId('schedule-action-strip');
    if ((await actionStrip.count()) > 0) {
      await expect.poll(async () => (await actionStrip.textContent()) ?? '').toContain('Edit shift');
    }
    await expect(shiftCardInDay(page, '2026-04-15', seededSchedule.editExpectation.shiftId)).toContainText(
      seededSchedule.editExpectation.nextTitle
    );
    await expect(shiftCardInDay(page, '2026-04-15', seededSchedule.editExpectation.shiftId)).toContainText('09:30 → 11:30');
  });

  await test.step('phase: move a seeded shift into a new day column', async () => {
    flow.mark('move-shift', seededSchedule.moveExpectation.shiftId);
    flow.setContext({
      note: 'moving a seeded shift from Thursday into Friday',
      focusShiftIds: [seededSchedule.moveExpectation.shiftId]
    });

    const supplierCard = shiftCard(page, seededSchedule.moveExpectation.shiftId);
    const moveDialog = supplierCard.locator('details:has(summary:has-text("Move timing"))');

    await moveDialog.locator('summary').click();
    await submitShiftEditorForm(moveDialog, {
      startAt: seededSchedule.moveExpectation.nextStartLocal,
      endAt: seededSchedule.moveExpectation.nextEndLocal
    });

    const actionStrip = page.getByTestId('schedule-action-strip');
    if ((await actionStrip.count()) > 0) {
      await expect.poll(async () => (await actionStrip.textContent()) ?? '').toContain('Move shift');
    }
    await expect(
      page.locator(
        `[data-testid="day-column-${seededSchedule.moveExpectation.fromDayKey}"] [data-testid="shift-card-${seededSchedule.moveExpectation.shiftId}"]`
      )
    ).toHaveCount(0);
    await expect(shiftCardInDay(page, seededSchedule.moveExpectation.toDayKey, seededSchedule.moveExpectation.shiftId)).toContainText(
      seededSchedule.moveExpectation.title
    );
    await expect(shiftCardInDay(page, seededSchedule.moveExpectation.toDayKey, seededSchedule.moveExpectation.shiftId)).toContainText(
      '15:00 → 17:00'
    );
  });

  await test.step('phase: delete a seeded shift and confirm the card disappears from the board', async () => {
    flow.mark('delete-shift', seededSchedule.deleteExpectation.shiftId);
    flow.setContext({
      note: 'deleting a seeded one-off shift from the visible week',
      focusShiftIds: [seededSchedule.deleteExpectation.shiftId]
    });

    await shiftCard(page, seededSchedule.deleteExpectation.shiftId)
      .getByRole('button', { name: 'Delete shift' })
      .click();

    const actionStrip = page.getByTestId('schedule-action-strip');
    if ((await actionStrip.count()) > 0) {
      await expect.poll(async () => (await actionStrip.textContent()) ?? '').toContain('Delete shift');
    }
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
    await expect(dayColumn(page, seededSchedule.deleteExpectation.dayKey)).not.toContainText(
      seededSchedule.deleteExpectation.title
    );
  });

  await test.step('phase: reload and prove the edited, moved, deleted, and recurring states survive a fresh route load', async () => {
    flow.mark('reload-calendar', seededCalendars.alphaShared);
    flow.setContext({
      note: 'reloading after create/edit/move/delete to prove server continuity',
      focusShiftIds: [seededSchedule.editExpectation.shiftId, seededSchedule.moveExpectation.shiftId]
    });

    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByTestId('calendar-week-board')).toBeVisible();

    const visibleWeek = await readVisibleWeekFromBoard(page);
    expect(visibleWeek.visibleWeekStart).toBe(seededSchedule.visibleWeek.start);
    expect(visibleWeek.visibleWeekEndExclusive).toBe(seededSchedule.visibleWeek.endExclusive);

    await expect(shiftCardInDay(page, '2026-04-15', seededSchedule.editExpectation.shiftId)).toContainText(
      seededSchedule.editExpectation.nextTitle
    );
    await expect(shiftCard(page, seededSchedule.deleteExpectation.shiftId)).toHaveCount(0);
    await expect(shiftCardInDay(page, seededSchedule.moveExpectation.toDayKey, seededSchedule.moveExpectation.shiftId)).toContainText(
      seededSchedule.moveExpectation.title
    );
    await expect(page.locator('[data-testid^="shift-card-"] h3').filter({ hasText: seededSchedule.recurringCreate.title })).toHaveCount(
      seededSchedule.recurringCreate.expectedDayKeys.length
    );
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
