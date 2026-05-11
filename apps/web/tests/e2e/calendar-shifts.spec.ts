import {
  expect,
  expectedCreateShiftPrefillValues,
  openCalendarWeek,
  openFindTimeRoute,
  readCreateShiftClashAdvisory,
  readCreateShiftPrefillSnapshot,
  readCreateShiftRecurrenceSnapshot,
  readFindTimeBrowseWindowCtaSnapshot,
  readVisibleWeekFromBoard,
  resolveVisibleShiftCardIdentity,
  seededCalendars,
  seededFindTime,
  seededSchedule,
  seededUsers,
  signInThroughUi,
  submitShiftEditorForm,
  syncCalendarFlowContext,
  test
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const proofShiftTitles = ['Overlap advisory proof', 'Find time browse handoff', 'Recurrence suggestion accept proof'] as const;

function dayColumn(page: import('@playwright/test').Page, dayKey: string) {
  return page.getByTestId(`day-column-${dayKey}`);
}

async function deleteVisibleShiftCardsByTitle(page: import('@playwright/test').Page, title: string) {
  let deletedCount = 0;

  while (true) {
    const card = page.locator('[data-testid^="shift-card-"]').filter({ hasText: title }).first();
    if ((await card.count()) === 0) {
      return deletedCount;
    }

    const testId = await card.getAttribute('data-testid');
    if (!testId) {
      throw new Error(`Expected a shift card test id while cleaning up proof shift \"${title}\".`);
    }

    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Delete shift' }).click();
    await expect(page.getByTestId(testId)).toHaveCount(0);
    deletedCount += 1;
  }
}

async function cleanupProofShifts(page: import('@playwright/test').Page, titles: readonly string[] = proofShiftTitles) {
  let deletedCount = 0;

  for (const title of titles) {
    deletedCount += await deleteVisibleShiftCardsByTitle(page, title);
  }

  if (deletedCount > 0) {
    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
  }

  return deletedCount;
}

async function openCreateShiftEditor(page: import('@playwright/test').Page) {
  const editor = page.getByTestId('create-shift-editor');
  const isOpen = await editor.evaluate((element) => (element instanceof HTMLDetailsElement ? element.open : false));

  if (!isOpen) {
    await editor.locator('summary').click();
  }

  await expect(editor).toHaveAttribute('open', '');
  return editor;
}

async function setShiftEditorDraft(
  editor: import('@playwright/test').Locator,
  values: {
    title?: string;
    startAt?: string;
    endAt?: string;
  }
) {
  const form = editor.locator('form');

  await form.evaluate((formElement, nextValues) => {
    if (!(formElement instanceof HTMLFormElement)) {
      throw new Error('Shift editor form element not found.');
    }

    const setTextInput = (selector: string, value: string) => {
      const input = formElement.querySelector(selector);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`Missing input for selector: ${selector}`);
      }

      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (typeof nextValues.title === 'string') {
      setTextInput('input[name="title"]', nextValues.title);
    }

    if (typeof nextValues.startAt === 'string') {
      setTextInput('input[name="startAt"]', nextValues.startAt);
    }

    if (typeof nextValues.endAt === 'string') {
      setTextInput('input[name="endAt"]', nextValues.endAt);
    }
  }, values);
}

test('overlapping Thursday create drafts show a warning-only advisory before submit and still save successfully', async ({
  page,
  flow
}) => {
  const createdTitle = 'Overlap advisory proof';
  const overlapDayKey = '2026-04-16';
  const overlapStartLocal = '2026-04-16T13:30';
  const overlapEndLocal = '2026-04-16T14:30';
  let savedShiftId: string | null = null;

  await test.step('phase: sign in and open the seeded Alpha week', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      focusShiftIds: [seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
      phase: 'overlap-advisory-create'
    });

    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('schedule-load-state')).toHaveCount(0);
    await cleanupProofShifts(page, [createdTitle]);
  });

  await test.step('phase: enter an overlapping Thursday window and prove the advisory appears before submit while save stays enabled', async () => {
    flow.mark('draft-overlap-window', `${overlapStartLocal} → ${overlapEndLocal}`);
    const editor = await openCreateShiftEditor(page);
    const form = editor.locator('form');

    await expect(form.locator('input[name="title"]')).toHaveValue('');
    await expect(form.locator('input[name="startAt"]')).toHaveValue('2026-04-13T09:00');
    await expect(form.locator('input[name="endAt"]')).toHaveValue('2026-04-13T13:00');

    await setShiftEditorDraft(editor, {
      title: createdTitle,
      startAt: overlapStartLocal,
      endAt: overlapEndLocal
    });

    await expect(form.locator('input[name="title"]')).toHaveValue(createdTitle);
    await expect(form.locator('input[name="startAt"]')).toHaveValue(overlapStartLocal);
    await expect(form.locator('input[name="endAt"]')).toHaveValue(overlapEndLocal);

    await expect
      .poll(
        async () => {
          const advisory = await readCreateShiftClashAdvisory(page);
          return advisory.overlapCount != null && advisory.overlapCount >= 2;
        },
        {
          message: 'expected the create dialog to render the pre-submit clash advisory for the seeded Thursday overlap'
        }
      )
      .toBe(true);

    const advisory = await readCreateShiftClashAdvisory(page);
    expect(advisory.visible).toBe(true);
    expect(advisory.overlapCount).not.toBeNull();
    expect(advisory.overlapCount ?? 0).toBeGreaterThanOrEqual(2);
    expect(advisory.conflictingShiftIds).toEqual(
      expect.arrayContaining([seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id])
    );
    expect(advisory.label).toContain('overlapping shift');
    expect(advisory.warningTone).toBe('Warning only');
    expect(advisory.detail).toContain('You can still save it');
    expect(advisory.items).toEqual(
      expect.arrayContaining(['Kitchen prep Apr 16 · 12:00–14:00 UTC', 'Supplier call Apr 16 · 13:00–15:00 UTC'])
    );
    expect(advisory.text).toContain('Heads up');

    await expect(form.getByRole('button', { name: 'Save shift' })).toBeEnabled();
    await syncCalendarFlowContext(page, flow, {
      focusShiftIds: [seededSchedule.shifts.kitchenPrep.id, seededSchedule.shifts.supplierCall.id],
      note: 'create draft showed the pre-submit clash advisory for the seeded Thursday overlap while save remained enabled'
    });
  });

  await test.step('phase: submit the warned draft and confirm the overlapping shift still saves', async () => {
    const editor = page.getByTestId('create-shift-editor');
    const form = editor.locator('form');
    await form.getByRole('button', { name: 'Save shift' }).click();

    await expect(dayColumn(page, overlapDayKey)).toContainText(createdTitle);
    const savedCard = await resolveVisibleShiftCardIdentity({
      page,
      title: createdTitle,
      dayKey: overlapDayKey,
      windowLabel: '13:30 → 14:30'
    });
    savedShiftId = savedCard.shiftId;
    await expect(savedCard.locator).toBeVisible();
    await expect(editor).not.toHaveAttribute('open', '');
  });

  await test.step('phase: delete the proof shift so later serial scenarios return to the seeded week state', async () => {
    if (!savedShiftId) {
      throw new Error('Expected the saved proof shift id before cleanup.');
    }

    const savedCard = page.getByTestId(`shift-card-${savedShiftId}`);
    await expect(savedCard).toBeVisible();
    await savedCard.getByRole('button', { name: 'Delete shift' }).click();
    await expect(savedCard).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await expect(page.getByTestId(`shift-card-${savedShiftId}`)).toHaveCount(0);
  });
});

test('touching-boundary create drafts stay advisory-free before submit', async ({ page, flow }) => {
  const clearTitle = 'Boundary clear advisory proof';
  const clearStartLocal = '2026-04-15T11:00';
  const clearEndLocal = '2026-04-15T12:00';

  await test.step('phase: sign in and open the seeded Alpha week', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      focusShiftIds: [seededSchedule.shifts.morningIntake.id, seededSchedule.shifts.afternoonHandoff.id],
      phase: 'clear-advisory-create'
    });

    await expect(page.getByRole('heading', { name: 'Alpha shared' })).toBeVisible();
    await expect(page.getByTestId('schedule-load-state')).toHaveCount(0);
    await cleanupProofShifts(page);
  });

  await test.step('phase: enter a touching Wednesday boundary window and prove the advisory stays absent before submit', async () => {
    flow.mark('draft-clear-window', `${clearStartLocal} → ${clearEndLocal}`);
    const editor = await openCreateShiftEditor(page);
    const form = editor.locator('form');

    await expect(form.locator('input[name="title"]')).toHaveValue('');
    await expect(form.locator('input[name="startAt"]')).toHaveValue('2026-04-13T09:00');
    await expect(form.locator('input[name="endAt"]')).toHaveValue('2026-04-13T13:00');

    await setShiftEditorDraft(editor, {
      title: clearTitle,
      startAt: clearStartLocal,
      endAt: clearEndLocal
    });

    await expect(form.locator('input[name="title"]')).toHaveValue(clearTitle);
    await expect(form.locator('input[name="startAt"]')).toHaveValue(clearStartLocal);
    await expect(form.locator('input[name="endAt"]')).toHaveValue(clearEndLocal);

    await expect
      .poll(async () => (await readCreateShiftClashAdvisory(page)).overlapCount, {
        message: 'expected the create dialog to stay advisory-free for the Wednesday touch boundary draft'
      })
      .toBeNull();

    const advisory = await readCreateShiftClashAdvisory(page);
    expect(advisory.visible).toBe(false);
    expect(advisory.overlapCount).toBeNull();
    expect(advisory.conflictingShiftIds).toEqual([]);
    expect(advisory.label).toBeNull();
    expect(advisory.detail).toBeNull();
    expect(advisory.items).toEqual([]);
    expect(advisory.text).toBeNull();

    await expect(form.getByRole('button', { name: 'Save shift' })).toBeEnabled();
    await syncCalendarFlowContext(page, flow, {
      focusShiftIds: [seededSchedule.shifts.morningIntake.id, seededSchedule.shifts.afternoonHandoff.id],
      note: 'create draft stayed advisory-free for the Wednesday touch boundary before submit'
    });
  });
});

test('browse suggestion handoff creates a visible shift on the intended day and does not reopen after reload', async ({ page, flow }) => {
  const createdTitle = 'Find time browse handoff';

  await test.step('phase: sign in, clear any prior proof rows, and open the truthful find-time route for the permitted Alpha calendar', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      phase: 'find-time-browse-cleanup'
    });
    await cleanupProofShifts(page, [createdTitle]);

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

  await test.step('phase: delete the handoff proof shift so later serial runs return to the seeded week state', async () => {
    await cleanupProofShifts(page, [createdTitle]);
  });
});

test('weekly recurrence suggestion accept path pre-fills weekly cadence truthfully and resets after a successful create', async ({
  page,
  flow
}) => {
  const createdTitle = 'Recurrence suggestion accept proof';

  await test.step('phase: sign in and open the Alpha week with the seeded recurrence pattern', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      focusShiftIds: seededSchedule.recurrenceSuggestion.matchingShiftIds,
      phase: 'recurrence-suggestion-accept'
    });

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await cleanupProofShifts(page, [createdTitle]);
  });

  await test.step('phase: accept the calm recurrence suggestion and verify only weekly plus interval one are prefilled', async () => {
    const editor = await openCreateShiftEditor(page);
    const initialSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(initialSnapshot.suggestionVisible).toBe(true);
    expect(initialSnapshot.suggestionCadence).toBe(seededSchedule.recurrenceSuggestion.cadence);
    expect(initialSnapshot.suggestionInterval).toBe('1');
    expect(initialSnapshot.suggestionWeekday).toBe(seededSchedule.recurrenceSuggestion.weekday);
    expect(initialSnapshot.suggestionMatchCount).toBe(seededSchedule.recurrenceSuggestion.matchingShiftIds.length);
    expect(initialSnapshot.selectedCadence).toBe('');
    expect(initialSnapshot.intervalValue).toBe('');
    expect(initialSnapshot.repeatCountValue).toBe('');
    expect(initialSnapshot.repeatUntilValue).toBe('');
    expect(initialSnapshot.fieldSuggestionState).toBe('idle');

    await editor.getByTestId('recurrence-suggestion-accept').dispatchEvent('click');

    const acceptedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(acceptedSnapshot.suggestionVisible).toBe(false);
    expect(acceptedSnapshot.selectedCadence).toBe('weekly');
    expect(acceptedSnapshot.intervalValue).toBe('1');
    expect(acceptedSnapshot.repeatCountValue).toBe('');
    expect(acceptedSnapshot.repeatUntilValue).toBe('');
    expect(acceptedSnapshot.fieldStateCadence).toBe('weekly');
    expect(acceptedSnapshot.fieldStateInterval).toBe('1');
    expect(acceptedSnapshot.fieldStateRepeatCount).toBe('');
    expect(acceptedSnapshot.fieldStateRepeatUntil).toBe('');
    expect(acceptedSnapshot.fieldSuggestionState).toBe('accepted');
  });

  await test.step('phase: submit a truthful bounded create, then prove success reset restores blank fields and a fresh suggestion surface', async () => {
    const editor = page.getByTestId('create-shift-editor');
    await submitShiftEditorForm(editor, {
      title: createdTitle,
      repeatCount: '2'
    });

    await expect(page.locator('[data-testid^="shift-card-"]').filter({ hasText: createdTitle }).first()).toBeVisible();

    await expect
      .poll(async () => (await readCreateShiftRecurrenceSnapshot(page)).selectedCadence, {
        message: 'expected the create dialog recurrence cadence to reset after the trusted create succeeded'
      })
      .toBe('');

    const resetSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(resetSnapshot.selectedCadence).toBe('');
    expect(resetSnapshot.intervalValue).toBe('');
    expect(resetSnapshot.repeatCountValue).toBe('');
    expect(resetSnapshot.repeatUntilValue).toBe('');
    expect(['idle', 'absent']).toContain(resetSnapshot.fieldSuggestionState);

    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();

    const reloadedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(reloadedSnapshot.suggestionVisible).toBe(true);
    expect(reloadedSnapshot.selectedCadence).toBe('');
    expect(reloadedSnapshot.intervalValue).toBe('');
    expect(reloadedSnapshot.repeatCountValue).toBe('');
    expect(reloadedSnapshot.repeatUntilValue).toBe('');
    expect(reloadedSnapshot.fieldSuggestionState).toBe('idle');
  });

  await test.step('phase: delete the recurrence proof shifts so later serial runs return to the seeded week state', async () => {
    await cleanupProofShifts(page, [createdTitle]);
  });
});

test('weekly recurrence suggestion dismiss path keeps the form blank, stays hidden for the current instance, and returns after reload', async ({
  page,
  flow
}) => {
  await test.step('phase: sign in and open the Alpha week with the seeded recurrence pattern', async () => {
    flow.mark('login', seededUsers.alphaMember.email);
    await signInThroughUi(page, seededUsers.alphaMember);

    await openCalendarWeek({
      page,
      flow,
      calendarId: seededCalendars.alphaShared,
      visibleWeekStart: seededSchedule.visibleWeek.start,
      focusShiftIds: seededSchedule.recurrenceSuggestion.matchingShiftIds,
      phase: 'recurrence-suggestion-dismiss'
    });

    await expect(page.getByTestId('calendar-shell')).toBeVisible();
    await cleanupProofShifts(page, ['Recurrence suggestion accept proof']);
  });

  await test.step('phase: dismiss the suggestion and prove recurrence fields stay blank while remaining editable', async () => {
    const editor = await openCreateShiftEditor(page);
    const initialSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(initialSnapshot.suggestionVisible).toBe(true);
    expect(initialSnapshot.selectedCadence).toBe('');

    await editor.getByTestId('recurrence-suggestion-dismiss').dispatchEvent('click');

    const dismissedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(dismissedSnapshot.suggestionVisible).toBe(false);
    expect(dismissedSnapshot.selectedCadence).toBe('');
    expect(dismissedSnapshot.intervalValue).toBe('');
    expect(dismissedSnapshot.repeatCountValue).toBe('');
    expect(dismissedSnapshot.repeatUntilValue).toBe('');
    expect(dismissedSnapshot.fieldStateCadence).toBe('one-off');
    expect(dismissedSnapshot.fieldStateInterval).toBe('');
    expect(dismissedSnapshot.fieldStateRepeatCount).toBe('');
    expect(dismissedSnapshot.fieldStateRepeatUntil).toBe('');
    expect(dismissedSnapshot.fieldSuggestionState).toBe('dismissed');

    const form = editor.locator('form');
    await form.evaluate((formElement) => {
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error('Shift editor form element not found.');
      }

      const setTextInput = (selector: string, value: string) => {
        const input = formElement.querySelector(selector);
        if (!(input instanceof HTMLInputElement)) {
          throw new Error(`Missing input for selector: ${selector}`);
        }

        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const radios = Array.from(formElement.querySelectorAll('input[name="recurrenceCadence"]')).filter(
        (candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement
      );
      for (const candidate of radios) {
        candidate.checked = candidate.value === 'weekly';
      }

      const weeklyRadio = radios.find((candidate) => candidate.value === 'weekly');
      weeklyRadio?.dispatchEvent(new Event('input', { bubbles: true }));
      weeklyRadio?.dispatchEvent(new Event('change', { bubbles: true }));

      setTextInput('input[name="recurrenceInterval"]', '2');
      setTextInput('input[name="repeatCount"]', '2');
    });

    const manualEditSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(manualEditSnapshot.suggestionVisible).toBe(false);
    expect(manualEditSnapshot.selectedCadence).toBe('weekly');
    expect(manualEditSnapshot.intervalValue).toBe('2');
    expect(manualEditSnapshot.repeatCountValue).toBe('2');
    expect(manualEditSnapshot.repeatUntilValue).toBe('');
  });

  await test.step('phase: reopen the dialog on the same page and keep the dismissed suggestion hidden until fresh loader data arrives', async () => {
    const editor = await openCreateShiftEditor(page);
    await editor.locator('summary').click();
    await expect(editor).not.toHaveAttribute('open', '');

    const reopenedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(reopenedSnapshot.suggestionVisible).toBe(false);
    expect(reopenedSnapshot.selectedCadence).toBe('');
    expect(reopenedSnapshot.intervalValue).toBe('');
    expect(reopenedSnapshot.repeatCountValue).toBe('');
    expect(reopenedSnapshot.repeatUntilValue).toBe('');
    expect(reopenedSnapshot.fieldSuggestionState).toBe('dismissed');

    await page.reload();
    await expect(page.getByTestId('calendar-shell')).toBeVisible();

    const reloadedSnapshot = await readCreateShiftRecurrenceSnapshot(page);
    expect(reloadedSnapshot.suggestionVisible).toBe(true);
    expect(reloadedSnapshot.selectedCadence).toBe('');
    expect(reloadedSnapshot.intervalValue).toBe('');
    expect(reloadedSnapshot.repeatCountValue).toBe('');
    expect(reloadedSnapshot.repeatUntilValue).toBe('');
    expect(reloadedSnapshot.fieldSuggestionState).toBe('idle');
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
