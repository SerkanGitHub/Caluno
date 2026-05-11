<script lang="ts">
  import { buildDefaultCreateTimes, toDateTimeLocalValue, type ShiftCardModel } from '@repo/caluno-core/schedule/board';
  import type { CreatePrefillPayload } from '@repo/caluno-core/schedule/create-prefill';
  import type { DetectedRecurrencePattern } from '@repo/caluno-core/schedule/recurrence';
  import type { CalendarControllerActionState, CalendarShift } from '@repo/caluno-core/schedule/types';
  import {
    acceptSuggestionDraft,
    buildSuggestionKey,
    deriveMobileClashAdvisory,
    deriveSuggestionState,
    dismissSuggestionDraft,
    resetCreateRecurrenceDraft,
    syncSuggestionLifecycle,
    type MobileRecurrenceCadence
  } from './shift-editor-predictive';

  export type ShiftEditorSubmitParams = {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
    formData: FormData;
  };

  type Props = {
    mode: ShiftEditorSubmitParams['action'];
    formId: string;
    calendarId: string;
    visibleWeekStart: string;
    shift?: ShiftCardModel | null;
    defaultDayKey?: string | null;
    createPrefill?: CreatePrefillPayload | null;
    recurrenceSuggestion?: DetectedRecurrencePattern | null;
    existingShifts?: CalendarShift[];
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    canSubmit: boolean;
    triggerLabel?: string;
    submitMutation: (params: ShiftEditorSubmitParams) => Promise<void>;
  };

  const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let {
    mode,
    formId,
    calendarId,
    visibleWeekStart,
    shift = null,
    defaultDayKey = null,
    createPrefill = null,
    recurrenceSuggestion = null,
    existingShifts = [],
    actionStates = [],
    pendingActionKey,
    canSubmit,
    triggerLabel = '',
    submitMutation
  }: Props = $props();

  let open = $state(false);
  let lastSeedKey = $state<string | null>(null);
  let handledStateId = $state<string | null>(null);
  let lastAutoOpenedPrefillKey = $state<string | null>(null);
  let draftTitle = $state('');
  let draftStartAt = $state('');
  let draftEndAt = $state('');
  let recurrenceCadence = $state<MobileRecurrenceCadence>('');
  let recurrenceInterval = $state('');
  let repeatCount = $state('');
  let repeatUntil = $state('');
  let acceptedSuggestionKey = $state<string | null>(null);
  let dismissedSuggestionKey = $state<string | null>(null);
  let lastSuggestionKey = $state<string | null>(null);
  let previousOpen = $state(false);

  const isSubmitting = $derived(pendingActionKey === formId);
  const scopedState = $derived(actionStates.find((state) => state.formId === formId) ?? null);
  const sheetTone = $derived.by(() => {
    if (!scopedState) {
      return 'tone-neutral';
    }

    if (scopedState.status === 'success') {
      return 'tone-neutral';
    }

    return scopedState.status === 'pending-local' || scopedState.status === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
  const defaultTimes = $derived(buildDefaultCreateTimes(defaultDayKey));
  const createPrefillKey = $derived.by(() =>
    mode === 'create' && createPrefill ? `${createPrefill.source}:${createPrefill.startAt}:${createPrefill.endAt}` : null
  );
  const seedKey = $derived.by(() => {
    if (mode === 'create') {
      return `create:${defaultDayKey ?? visibleWeekStart}:${createPrefillKey ?? 'manual'}`;
    }

    return `${mode}:${shift?.id ?? 'unknown'}:${shift?.startAt ?? 'none'}:${shift?.endAt ?? 'none'}`;
  });
  const currentSuggestionKey = $derived.by(() => buildSuggestionKey(recurrenceSuggestion));
  const suggestionState = $derived.by(() =>
    deriveSuggestionState({
      currentSuggestionKey,
      lifecycle: {
        acceptedSuggestionKey,
        dismissedSuggestionKey
      }
    })
  );
  const shouldShowSuggestion = $derived(
    mode === 'create' && Boolean(recurrenceSuggestion) && suggestionState === 'idle'
  );
  const suggestionWeekdayLabel = $derived.by(() =>
    recurrenceSuggestion ? weekdayLabels[recurrenceSuggestion.weekday] ?? 'Weekly' : 'Weekly'
  );
  const suggestionToneCopy = $derived.by(() => {
    if (!recurrenceSuggestion) {
      return null;
    }

    return `Recent shifts suggest a calm ${suggestionWeekdayLabel.toLowerCase()} ${recurrenceSuggestion.startTime}–${recurrenceSuggestion.endTime} rhythm.`;
  });
  const advisory = $derived.by(() =>
    deriveMobileClashAdvisory({
      mode,
      calendarId,
      shiftId: shift?.id ?? null,
      title: draftTitle,
      fallbackTitle: shift?.title ?? '',
      startAt: draftStartAt,
      endAt: draftEndAt,
      existingShifts
    })
  );
  const buttonLabel = $derived.by(() => {
    if (triggerLabel) {
      return triggerLabel;
    }

    switch (mode) {
      case 'create':
        return 'New shift';
      case 'edit':
        return 'Edit';
      case 'move':
        return 'Move';
      case 'delete':
        return 'Delete';
    }
  });
  const heading = $derived.by(() => {
    switch (mode) {
      case 'create':
        return 'Create a shift';
      case 'edit':
        return 'Edit shift details';
      case 'move':
        return 'Move this shift';
      case 'delete':
        return 'Delete this shift';
    }
  });
  const submitLabel = $derived.by(() => {
    if (isSubmitting) {
      return mode === 'delete' ? 'Deleting…' : 'Saving…';
    }

    switch (mode) {
      case 'create':
        return 'Save locally';
      case 'edit':
        return 'Save edits';
      case 'move':
        return 'Save move';
      case 'delete':
        return 'Delete shift';
    }
  });

  function reseedDraft() {
    if (mode === 'create') {
      draftTitle = '';
      draftStartAt = createPrefill?.startAtLocal ?? defaultTimes.startAt;
      draftEndAt = createPrefill?.endAtLocal ?? defaultTimes.endAt;
      const reset = resetCreateRecurrenceDraft({
        dismissedSuggestionKey
      });
      recurrenceCadence = reset.recurrenceCadence;
      recurrenceInterval = reset.recurrenceInterval;
      repeatCount = reset.repeatCount;
      repeatUntil = reset.repeatUntil;
      acceptedSuggestionKey = reset.acceptedSuggestionKey;
      dismissedSuggestionKey = reset.dismissedSuggestionKey;
      return;
    }

    draftTitle = shift?.title ?? '';
    draftStartAt = toDateTimeLocalValue(shift?.startAt) || defaultTimes.startAt;
    draftEndAt = toDateTimeLocalValue(shift?.endAt) || defaultTimes.endAt;
    recurrenceCadence = '';
    recurrenceInterval = '';
    repeatCount = '';
    repeatUntil = '';
  }

  function closeSheet() {
    if (isSubmitting) {
      return;
    }

    open = false;
  }

  function acceptSuggestion() {
    const next = acceptSuggestionDraft({
      suggestionKey: currentSuggestionKey
    });

    recurrenceCadence = next.recurrenceCadence;
    recurrenceInterval = next.recurrenceInterval;
    repeatCount = next.repeatCount;
    repeatUntil = next.repeatUntil;
    acceptedSuggestionKey = next.acceptedSuggestionKey;
    dismissedSuggestionKey = next.dismissedSuggestionKey;
  }

  function dismissSuggestion() {
    const next = dismissSuggestionDraft({
      suggestionKey: currentSuggestionKey
    });

    recurrenceCadence = '';
    recurrenceInterval = '';
    repeatCount = '';
    repeatUntil = '';
    acceptedSuggestionKey = next.acceptedSuggestionKey;
    dismissedSuggestionKey = next.dismissedSuggestionKey;
  }

  function setRecurrenceCadence(nextCadence: MobileRecurrenceCadence) {
    recurrenceCadence = nextCadence;

    if (nextCadence === '') {
      recurrenceInterval = '';
      repeatCount = '';
      repeatUntil = '';
      acceptedSuggestionKey = null;
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!canSubmit || isSubmitting) {
      return;
    }

    const formData = new FormData();
    formData.set('calendarId', calendarId);
    formData.set('visibleWeekStart', visibleWeekStart);

    if (shift) {
      formData.set('shiftId', shift.id);
    }

    if (mode === 'delete') {
      formData.set('title', shift?.title ?? '');
      formData.set('startAt', shift?.startAt ? toDateTimeLocalValue(shift.startAt) : '');
      formData.set('endAt', shift?.endAt ? toDateTimeLocalValue(shift.endAt) : '');
    } else {
      formData.set('title', mode === 'move' ? shift?.title ?? '' : draftTitle);
      formData.set('startAt', draftStartAt);
      formData.set('endAt', draftEndAt);
      formData.set('recurrenceCadence', recurrenceCadence);
      formData.set('recurrenceInterval', recurrenceInterval);
      formData.set('repeatCount', repeatCount);
      formData.set('repeatUntil', repeatUntil);
    }

    await submitMutation({
      action: mode,
      formId,
      formData
    });
  }

  function formatAdvisoryWindow(conflict: CalendarShift): string {
    const start = new Date(conflict.startAt);
    const end = new Date(conflict.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${conflict.startAt} → ${conflict.endAt}`;
    }

    const sameDay = conflict.startAt.slice(0, 10) === conflict.endAt.slice(0, 10);
    if (sameDay) {
      return `${formatUtcMonthDay(start)} · ${formatUtcTime(start)}–${formatUtcTime(end)} UTC`;
    }

    return `${formatUtcMonthDay(start)} ${formatUtcTime(start)} → ${formatUtcMonthDay(end)} ${formatUtcTime(end)} UTC`;
  }

  function formatUtcMonthDay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  function formatUtcTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  }

  $effect(() => {
    if (lastSeedKey === seedKey) {
      return;
    }

    lastSeedKey = seedKey;
    reseedDraft();
  });

  $effect(() => {
    if (!createPrefillKey || lastAutoOpenedPrefillKey === createPrefillKey) {
      return;
    }

    lastAutoOpenedPrefillKey = createPrefillKey;
    open = true;
  });

  $effect(() => {
    const nextLifecycle = syncSuggestionLifecycle({
      mode,
      currentSuggestionKey,
      lifecycle: {
        acceptedSuggestionKey,
        dismissedSuggestionKey,
        lastSuggestionKey
      }
    });

    if (
      nextLifecycle.acceptedSuggestionKey === acceptedSuggestionKey &&
      nextLifecycle.dismissedSuggestionKey === dismissedSuggestionKey &&
      nextLifecycle.lastSuggestionKey === lastSuggestionKey
    ) {
      return;
    }

    acceptedSuggestionKey = nextLifecycle.acceptedSuggestionKey;
    dismissedSuggestionKey = nextLifecycle.dismissedSuggestionKey;
    lastSuggestionKey = nextLifecycle.lastSuggestionKey;
  });

  $effect(() => {
    const wasOpen = previousOpen;
    previousOpen = open;

    if (open || !wasOpen) {
      return;
    }

    reseedDraft();
  });

  $effect(() => {
    if (!scopedState || handledStateId === scopedState.id) {
      return;
    }

    handledStateId = scopedState.id;
    if (
      scopedState.status === 'success' ||
      scopedState.status === 'pending-local' ||
      scopedState.status === 'timeout' ||
      scopedState.status === 'write-error' ||
      scopedState.status === 'forbidden' ||
      scopedState.status === 'malformed-response'
    ) {
      if (mode === 'create' && (scopedState.status === 'success' || scopedState.status === 'pending-local')) {
        const reset = resetCreateRecurrenceDraft({
          clearSuggestionFeedback: true
        });
        recurrenceCadence = reset.recurrenceCadence;
        recurrenceInterval = reset.recurrenceInterval;
        repeatCount = reset.repeatCount;
        repeatUntil = reset.repeatUntil;
        acceptedSuggestionKey = reset.acceptedSuggestionKey;
        dismissedSuggestionKey = reset.dismissedSuggestionKey;
      }

      open = false;
    }
  });
</script>

<button
  class={`button ${mode === 'create' ? 'button-primary' : mode === 'delete' ? 'button-danger' : 'button-secondary'}`}
  type="button"
  onclick={() => (open = true)}
  disabled={!canSubmit && mode === 'create'}
  data-testid={`${mode}-shift-trigger-${formId.replace(/:/g, '-')}`}
  data-create-source={mode === 'create' ? createPrefill?.source ?? 'manual' : ''}
>
  {buttonLabel}
</button>

{#if open}
  <div class="sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeSheet()}>
    <div
      class={`shift-editor-sheet framed-panel ${sheetTone}`}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      data-testid={`${mode}-shift-editor`}
      data-mode={mode}
      data-form-id={formId}
      data-open-on-arrival={mode === 'create' && createPrefill ? 'true' : 'false'}
      data-create-source={mode === 'create' ? createPrefill?.source ?? 'manual' : ''}
    >
      <header class="shift-editor-sheet__header">
        <div>
          <p class="panel-kicker">Phone-first {mode}</p>
          <h3>{heading}</h3>
        </div>
        <button class="sheet-close" type="button" onclick={closeSheet} aria-label="Close shift editor">✕</button>
      </header>

      {#if mode === 'delete'}
        <p class="panel-copy">
          This removes <strong>{shift?.title ?? 'this shift'}</strong> from the visible week and stages the delete locally before the trusted path confirms it.
        </p>
        <dl class="facts-grid compact">
          <div>
            <dt>Window</dt>
            <dd>{shift?.rangeLabel ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Shift id</dt>
            <dd><code>{shift?.id ?? 'unknown'}</code></dd>
          </div>
        </dl>
      {:else}
        {#if mode === 'create' && createPrefill}
          <article
            class="inline-state tone-neutral"
            data-testid="create-prefill-source"
            data-prefill-source={createPrefill.source}
            data-prefill-start={createPrefill.startAt}
            data-prefill-end={createPrefill.endAt}
          >
            <strong>From Find time</strong>
            <p>The create sheet opened from a shared free-time slot and kept the exact UTC window intact.</p>
          </article>
        {/if}

        <form class="shift-editor-sheet__form" onsubmit={handleSubmit}>
          {#if mode !== 'move'}
            <label class="field">
              <span>Title</span>
              <input class="input" name="title" bind:value={draftTitle} placeholder="Opening shift" required data-testid={`${mode}-title-input`} />
            </label>
          {:else}
            <div class="code-strip">
              <span>Shift title</span>
              <code>{shift?.title ?? 'Unknown shift'}</code>
            </div>
          {/if}

          <div class="calendar-form-grid">
            <label class="field">
              <span>Start</span>
              <input class="input" type="datetime-local" name="startAt" bind:value={draftStartAt} required data-testid={`${mode}-start-input`} />
            </label>
            <label class="field">
              <span>End</span>
              <input class="input" type="datetime-local" name="endAt" bind:value={draftEndAt} required data-testid={`${mode}-end-input`} />
            </label>
          </div>

          {#if advisory.conflicts.length > 0}
            <article
              class="inline-state tone-warning clash-advisory"
              data-testid="clash-advisory"
              data-overlap-count={advisory.conflicts.length}
              data-conflicting-shift-ids={advisory.conflicts.map((conflict) => conflict.id).join(',')}
              data-current-shift-id={shift?.id ?? 'none'}
              aria-live="polite"
              aria-atomic="true"
            >
              <div class="clash-advisory__header">
                <div>
                  <p class="panel-kicker">Heads up</p>
                  <strong>{advisory.overlapLabel}</strong>
                </div>
                <span class="pill pill-warning">Warning only</span>
              </div>
              <p>This draft overlaps another visible-week shift in the same calendar. Save stays enabled if the overlap is intentional.</p>
              <ul class="clash-advisory__list">
                {#each advisory.conflicts as conflict (conflict.id)}
                  <li>
                    <strong>{conflict.title}</strong>
                    <span>{formatAdvisoryWindow(conflict)}</span>
                  </li>
                {/each}
              </ul>
            </article>
          {/if}

          {#if mode === 'create'}
            <div class="recurrence-block">
              <div class="recurrence-block__header">
                <div>
                  <p class="panel-kicker">Optional recurrence</p>
                  <h4>Bound the repeat locally</h4>
                </div>
                <span class="pill">Count or until required</span>
              </div>

              <article
                class="inline-state recurrence-field-state"
                data-testid="recurrence-field-state"
                data-cadence={recurrenceCadence || 'one-off'}
                data-interval={recurrenceInterval || 'none'}
                data-repeat-count={repeatCount || 'none'}
                data-repeat-until={repeatUntil || 'none'}
                data-suggestion-state={suggestionState}
                data-suggestion-match-count={recurrenceSuggestion?.matchCount ?? 0}
                data-suggestion-exemplar-shift-id={recurrenceSuggestion?.exemplarShiftId ?? 'none'}
              >
                <strong>{recurrenceCadence ? `${recurrenceCadence} recurrence` : 'One-off shift'}</strong>
                <p>
                  {#if suggestionState === 'accepted'}
                    Weekly cadence came from the suggestion, but the chosen draft timing stayed exactly as entered.
                  {:else if suggestionState === 'dismissed'}
                    The current suggestion is hidden for this page instance until fresh route data arrives.
                  {:else if recurrenceCadence === 'weekly' && recurrenceInterval === '1'}
                    Repeats every week. Repeat bounds stay blank until you choose one.
                  {:else if recurrenceCadence}
                    Repeat cadence stays editable until you add a count or end date.
                  {:else}
                    Leave this blank for a single shift, or choose a cadence below.
                  {/if}
                </p>
              </article>

              {#if shouldShowSuggestion && recurrenceSuggestion}
                <article
                  class="recurrence-suggestion"
                  data-testid="recurrence-suggestion"
                  data-cadence={recurrenceSuggestion.cadence}
                  data-interval={recurrenceSuggestion.interval}
                  data-weekday={recurrenceSuggestion.weekday}
                  data-match-count={recurrenceSuggestion.matchCount}
                  data-exemplar-shift-id={recurrenceSuggestion.exemplarShiftId}
                >
                  <div>
                    <p class="panel-kicker">Calm suggestion</p>
                    <strong>{suggestionWeekdayLabel} {recurrenceSuggestion.startTime}–{recurrenceSuggestion.endTime}</strong>
                    <p>{suggestionToneCopy}</p>
                  </div>

                  <div class="recurrence-suggestion__actions">
                    <button
                      class="button button-secondary"
                      type="button"
                      data-testid="recurrence-suggestion-accept"
                      onclick={acceptSuggestion}
                    >
                      Use weekly suggestion
                    </button>
                    <button
                      class="button button-secondary recurrence-suggestion__dismiss"
                      type="button"
                      data-testid="recurrence-suggestion-dismiss"
                      onclick={dismissSuggestion}
                    >
                      Dismiss suggestion
                    </button>
                  </div>
                </article>
              {/if}

              <div class="calendar-form-grid recurrence-block__grid">
                <label class="field">
                  <span>Cadence</span>
                  <select class="input" name="recurrenceCadence" bind:value={recurrenceCadence} onchange={(event) => setRecurrenceCadence((event.currentTarget as HTMLSelectElement).value as MobileRecurrenceCadence)} data-testid={`${mode}-recurrence-cadence-input`}>
                    <option value="">One-off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <label class="field">
                  <span>Interval</span>
                  <input class="input" type="number" min="1" step="1" name="recurrenceInterval" bind:value={recurrenceInterval} data-testid={`${mode}-recurrence-interval-input`} />
                </label>
                <label class="field">
                  <span>Repeat count</span>
                  <input class="input" type="number" min="1" step="1" name="repeatCount" bind:value={repeatCount} data-testid={`${mode}-repeat-count-input`} />
                </label>
                <label class="field">
                  <span>Repeat until</span>
                  <input class="input" type="datetime-local" name="repeatUntil" bind:value={repeatUntil} data-testid={`${mode}-repeat-until-input`} />
                </label>
              </div>
            </div>
          {/if}
        </form>
      {/if}

      {#if scopedState}
        <article class={`inline-state ${sheetTone}`} data-testid={`${mode}-state`}>
          <strong>{scopedState.reason}</strong>
          <p>{scopedState.message}</p>
        </article>
      {/if}

      {#if !canSubmit}
        <article class="inline-state tone-warning" data-testid={`${mode}-readonly-state`}>
          <strong>READ_ONLY_CONTINUITY</strong>
          <p>This cached continuity reopen is read-only until a trusted session is available again.</p>
        </article>
      {/if}

      <footer class="shift-editor-sheet__footer">
        <button class="button button-secondary" type="button" onclick={closeSheet} data-testid={`${mode}-dismiss-button`}>Keep browsing</button>
        <button class={`button ${mode === 'delete' ? 'button-danger' : 'button-primary'}`} type="button" onclick={(event) => handleSubmit(event as unknown as SubmitEvent)} disabled={!canSubmit || isSubmitting} data-testid={`${mode}-submit-button`}>
          {submitLabel}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    align-items: end;
    background: rgba(34, 31, 27, 0.42);
    backdrop-filter: blur(10px);
    padding: 1rem;
  }

  .shift-editor-sheet {
    display: grid;
    gap: 0.95rem;
    width: min(36rem, 100%);
    margin: 0 auto;
    padding: 1rem;
    border-radius: 1.6rem;
  }

  .shift-editor-sheet__header,
  .shift-editor-sheet__footer,
  .recurrence-block__header,
  .clash-advisory__header,
  .recurrence-suggestion__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .shift-editor-sheet__header,
  .recurrence-block__header,
  .clash-advisory__header {
    align-items: flex-start;
  }

  .shift-editor-sheet__form,
  .recurrence-block,
  .field,
  .facts-grid,
  .compact,
  .code-strip,
  .inline-state,
  .clash-advisory__list,
  .clash-advisory__list li,
  .recurrence-suggestion {
    display: grid;
    gap: 0.75rem;
  }

  .panel-kicker,
  .panel-copy,
  h3,
  h4,
  p,
  dt,
  dd,
  span,
  ul,
  li {
    margin: 0;
  }

  .panel-kicker,
  dt,
  .field span,
  .code-strip span {
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--caluno-ink-soft);
  }

  h3 {
    font-size: 1.4rem;
    line-height: 1.06;
  }

  h4 {
    font-size: 1.05rem;
    line-height: 1.1;
  }

  .panel-copy,
  dd,
  .recurrence-suggestion p,
  .clash-advisory__list span {
    color: var(--caluno-ink-muted);
    line-height: 1.55;
  }

  .calendar-form-grid,
  .recurrence-block__grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    gap: 0.45rem;
  }

  .input {
    width: 100%;
    min-height: 3.05rem;
    padding: 0.82rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.12);
    background: rgba(255, 255, 255, 0.85);
    color: var(--caluno-ink-strong);
  }

  .input:focus {
    outline: 2px solid rgba(17, 78, 85, 0.25);
    outline-offset: 2px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    border: 1px solid transparent;
    font-weight: 700;
    font-size: 0.94rem;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .button-primary {
    color: white;
    background: linear-gradient(135deg, #114e55, #2a8279);
    box-shadow: 0 18px 28px rgba(17, 78, 85, 0.18);
  }

  .button-secondary {
    color: var(--caluno-ink-strong);
    background: rgba(255, 255, 255, 0.76);
    border-color: rgba(34, 31, 27, 0.08);
  }

  .button-danger {
    color: white;
    background: linear-gradient(135deg, #8e2a30, #b84d58);
    box-shadow: 0 18px 28px rgba(142, 42, 48, 0.2);
  }

  .sheet-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 999px;
    border: 1px solid rgba(34, 31, 27, 0.08);
    background: rgba(255, 255, 255, 0.76);
    font-size: 1rem;
    cursor: pointer;
  }

  .pill,
  code {
    justify-self: start;
    padding: 0.34rem 0.7rem;
    border-radius: 999px;
    background: rgba(17, 78, 85, 0.08);
    color: var(--caluno-accent-deep);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .inline-state,
  .recurrence-suggestion {
    padding: 0.82rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .recurrence-field-state {
    background: rgba(255, 255, 255, 0.72);
  }

  .recurrence-suggestion {
    background: rgba(255, 255, 255, 0.82);
  }

  .clash-advisory__list {
    padding-left: 1rem;
  }

  .clash-advisory__list li {
    gap: 0.2rem;
  }

  .code-strip,
  .facts-grid div {
    padding: 0.8rem 0.86rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
    background: rgba(255, 255, 255, 0.74);
  }

  .facts-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.94);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.94);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.94);
  }

  @media (max-width: 32rem) {
    .sheet-backdrop {
      padding: 0.7rem;
    }

    .calendar-form-grid,
    .recurrence-block__grid,
    .facts-grid.compact,
    .shift-editor-sheet__footer,
    .recurrence-suggestion__actions {
      grid-template-columns: 1fr;
    }

    .shift-editor-sheet__footer,
    .recurrence-suggestion__actions {
      display: grid;
    }
  }
</style>
