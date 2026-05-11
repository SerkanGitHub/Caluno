<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { CalendarControllerActionState } from '$lib/offline/calendar-controller';
  import { buildDefaultCreateTimes, toDateTimeLocalValue } from '$lib/schedule/board';
  import type { CreatePrefillPayload } from '$lib/schedule/create-prefill';
  import type { ShiftCardModel } from '$lib/schedule/board';
  import type { ScheduleRecurrenceSuggestion } from '$lib/server/schedule';

  type Mode = 'create' | 'edit' | 'move';
  type RecurrenceCadence = '' | 'daily' | 'weekly' | 'monthly';

  type Props = {
    action: Mode;
    mode: Mode;
    formId: string;
    visibleWeekStart: string;
    createPrefill?: CreatePrefillPayload | null;
    recurrenceSuggestion?: ScheduleRecurrenceSuggestion | null;
    actionStates?: CalendarControllerActionState[];
    shift?: ShiftCardModel | null;
    defaultDayKey?: string | null;
    pendingActionKey: string | null;
    enhanceMutation: (params: {
      action: 'create' | 'edit' | 'move' | 'delete';
      formId: string;
    }) => SubmitFunction;
  };

  const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let {
    action,
    mode,
    formId,
    visibleWeekStart,
    createPrefill = null,
    recurrenceSuggestion = null,
    actionStates = [],
    shift = null,
    defaultDayKey = null,
    pendingActionKey,
    enhanceMutation
  }: Props = $props();

  const defaultTimes = $derived(buildDefaultCreateTimes(defaultDayKey));
  const createPrefillKey = $derived.by(() =>
    mode === 'create' && createPrefill
      ? `${createPrefill.source}:${createPrefill.startAt}:${createPrefill.endAt}`
      : null
  );
  const currentSuggestionKey = $derived.by(() => buildSuggestionKey(recurrenceSuggestion));
  const suggestionWeekdayLabel = $derived.by(() =>
    recurrenceSuggestion ? weekdayLabels[recurrenceSuggestion.weekday] ?? 'weekly' : 'weekly'
  );
  const suggestionToneCopy = $derived.by(() => {
    if (!recurrenceSuggestion) {
      return null;
    }

    return `Recent shifts suggest a calm ${suggestionWeekdayLabel.toLowerCase()} ${recurrenceSuggestion.startTime}–${recurrenceSuggestion.endTime} rhythm.`;
  });
  const suggestionState = $derived.by(() => {
    if (!currentSuggestionKey) {
      return 'absent';
    }

    if (dismissedSuggestionKey === currentSuggestionKey) {
      return 'dismissed';
    }

    if (acceptedSuggestionKey === currentSuggestionKey) {
      return 'accepted';
    }

    return 'idle';
  });
  const shouldShowSuggestion = $derived(
    mode === 'create' && Boolean(recurrenceSuggestion) && suggestionState === 'idle'
  );
  let open = $state(false);
  let lastAutoOpenedPrefillKey = $state<string | null>(null);
  let recurrenceCadence = $state<RecurrenceCadence>('');
  let recurrenceInterval = $state('');
  let repeatCount = $state('');
  let repeatUntil = $state('');
  let acceptedSuggestionKey = $state<string | null>(null);
  let dismissedSuggestionKey = $state<string | null>(null);
  let previousOpen = $state(false);
  let lastSuggestionKey = $state<string | null>(null);
  let lastHandledSuccessToken = $state<string | null>(null);
  const isSubmitting = $derived(pendingActionKey === formId);
  const actionTarget = $derived(`?/${mode === 'create' ? 'createShift' : mode === 'edit' ? 'editShift' : 'moveShift'}&start=${visibleWeekStart}`);
  const scopedState = $derived(actionStates.find((state) => state.formId === formId) ?? null);
  const scopedStateToken = $derived.by(() =>
    scopedState ? `${scopedState.status}:${scopedState.reason}:${scopedState.message}` : null
  );
  const tone = $derived.by(() => {
    if (!scopedState) {
      return 'tone-neutral';
    }

    if (scopedState.status === 'success') {
      return 'tone-neutral';
    }

    return scopedState.status === 'pending-local' || scopedState.status === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
  const summaryLabel = $derived.by(() => {
    if (mode === 'create') {
      return 'Plan a shift';
    }

    if (mode === 'edit') {
      return 'Edit details';
    }

    return 'Move timing';
  });
  const heading = $derived.by(() => {
    if (mode === 'create') {
      return 'Create a shift';
    }

    if (mode === 'edit') {
      return 'Revise shift details';
    }

    return 'Move this shift';
  });
  const submitLabel = $derived.by(() => {
    if (mode === 'create') {
      return 'Save shift';
    }

    if (mode === 'edit') {
      return 'Save edits';
    }

    return 'Save new timing';
  });
  const titleValue = $derived.by(() => {
    if (mode === 'move') {
      return shift?.title ?? '';
    }

    return shift?.title ?? '';
  });
  const startValue = $derived.by(() => {
    if (mode === 'create' && createPrefill) {
      return createPrefill.startAtLocal;
    }

    return toDateTimeLocalValue(shift?.startAt) || defaultTimes.startAt;
  });
  const endValue = $derived.by(() => {
    if (mode === 'create' && createPrefill) {
      return createPrefill.endAtLocal;
    }

    return toDateTimeLocalValue(shift?.endAt) || defaultTimes.endAt;
  });

  function buildSuggestionKey(suggestion: ScheduleRecurrenceSuggestion | null): string | null {
    if (!suggestion) {
      return null;
    }

    return [
      suggestion.exemplarShiftId,
      suggestion.cadence,
      suggestion.interval,
      suggestion.weekday,
      suggestion.startTime,
      suggestion.endTime,
      suggestion.matchCount,
      suggestion.matchingShiftIds.join(',')
    ].join(':');
  }

  function resetCreateRecurrenceState(options: {
    clearSuggestionFeedback?: boolean;
    preserveDismissal?: boolean;
  } = {}) {
    recurrenceCadence = '';
    recurrenceInterval = '';
    repeatCount = '';
    repeatUntil = '';

    if (options.clearSuggestionFeedback) {
      acceptedSuggestionKey = null;
      dismissedSuggestionKey = null;
      return;
    }

    acceptedSuggestionKey = null;
    if (!options.preserveDismissal) {
      dismissedSuggestionKey = null;
    }
  }

  function setRecurrenceCadence(nextCadence: RecurrenceCadence) {
    recurrenceCadence = nextCadence;

    if (nextCadence === '') {
      recurrenceInterval = '';
      repeatCount = '';
      repeatUntil = '';
      acceptedSuggestionKey = null;
    }
  }

  function acceptSuggestion() {
    const suggestionKey = currentSuggestionKey;
    if (!recurrenceSuggestion || !suggestionKey) {
      return;
    }

    recurrenceCadence = 'weekly';
    recurrenceInterval = '1';
    repeatCount = '';
    repeatUntil = '';
    acceptedSuggestionKey = suggestionKey;
    dismissedSuggestionKey = null;
  }

  function dismissSuggestion() {
    const suggestionKey = currentSuggestionKey;
    if (!suggestionKey) {
      return;
    }

    resetCreateRecurrenceState({ preserveDismissal: true });
    dismissedSuggestionKey = suggestionKey;
  }

  function updateTextField(event: Event, field: 'recurrenceInterval' | 'repeatCount' | 'repeatUntil') {
    const value = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';

    if (field === 'recurrenceInterval') {
      recurrenceInterval = value;
      return;
    }

    if (field === 'repeatCount') {
      repeatCount = value;
      return;
    }

    repeatUntil = value;
  }

  $effect(() => {
    if (!createPrefillKey) {
      lastAutoOpenedPrefillKey = null;
      return;
    }

    if (lastAutoOpenedPrefillKey === createPrefillKey) {
      return;
    }

    open = true;
    lastAutoOpenedPrefillKey = createPrefillKey;
  });

  $effect(() => {
    if (mode !== 'create') {
      lastSuggestionKey = null;
      resetCreateRecurrenceState({ clearSuggestionFeedback: true });
      return;
    }

    if (currentSuggestionKey === lastSuggestionKey) {
      return;
    }

    lastSuggestionKey = currentSuggestionKey;
    resetCreateRecurrenceState({ clearSuggestionFeedback: true });
  });

  $effect(() => {
    const wasOpen = previousOpen;
    previousOpen = open;

    if (mode !== 'create' || open || !wasOpen) {
      return;
    }

    resetCreateRecurrenceState({ preserveDismissal: true });
  });

  $effect(() => {
    if (mode !== 'create' || scopedState?.status !== 'success' || !scopedStateToken) {
      return;
    }

    if (lastHandledSuccessToken === scopedStateToken) {
      return;
    }

    lastHandledSuccessToken = scopedStateToken;
    open = false;
    resetCreateRecurrenceState({ clearSuggestionFeedback: true });
  });
</script>

<details
  class={`shift-editor ${mode === 'create' ? 'shift-editor--create' : ''}`}
  bind:open
  data-testid={`${mode}-shift-editor`}
  data-create-source={mode === 'create' ? createPrefill?.source ?? 'manual' : ''}
  data-open-on-arrival={mode === 'create' && createPrefill ? 'true' : 'false'}
>
  <summary class={`button ${mode === 'create' ? 'button-primary' : 'button-secondary'}`}>{summaryLabel}</summary>

  <div class="shift-editor__panel framed-panel">
    <div class="shift-editor__header">
      <div>
        <p class="panel-kicker">{mode === 'create' ? 'Local-first create' : mode === 'edit' ? 'Local-first edit' : 'Local-first move'}</p>
        <h3>{heading}</h3>
      </div>
      <span class="pill pill-neutral">UTC times</span>
    </div>

    {#if mode === 'create' && createPrefill}
      <article
        class="inline-state tone-neutral"
        data-testid="create-prefill-source"
        data-prefill-source={createPrefill.source}
        data-prefill-start={createPrefill.startAt}
        data-prefill-end={createPrefill.endAt}
      >
        <strong>From Find time</strong>
        <p>The dialog opened from a shared free-time suggestion and preserved the exact slot window.</p>
      </article>
    {/if}

    <form method="POST" action={actionTarget} use:enhance={enhanceMutation({ action, formId })} class="stacked-form">
      <input type="hidden" name="visibleWeekStart" value={visibleWeekStart} />
      {#if shift}
        <input type="hidden" name="shiftId" value={shift.id} />
      {/if}

      <fieldset class="shift-editor__fieldset" disabled={isSubmitting}>
        {#if mode !== 'move'}
          <label class="field">
            <span>Title</span>
            <input class="input" name="title" value={titleValue} placeholder="Opening shift" required />
          </label>
        {:else}
          <div class="code-strip shift-editor__locked-title">
            <span>Shift title</span>
            <code>{shift?.title ?? 'Unknown shift'}</code>
          </div>
          <input type="hidden" name="title" value={shift?.title ?? ''} />
        {/if}

        <div class="calendar-form-grid">
          <label class="field">
            <span>Start</span>
            <input class="input" type="datetime-local" name="startAt" value={startValue} required />
          </label>

          <label class="field">
            <span>End</span>
            <input class="input" type="datetime-local" name="endAt" value={endValue} required />
          </label>
        </div>

        {#if mode === 'create'}
          <div class="recurrence-fields">
            <div class="recurrence-fields__header">
              <div>
                <p class="panel-kicker">Bounded recurrence</p>
                <h3>Optional repeat rule</h3>
              </div>
              <span class="pill pill-neutral">Count or until required</span>
            </div>

            <div
              class="recurrence-fields__state"
              data-testid="recurrence-field-state"
              data-cadence={recurrenceCadence || 'one-off'}
              data-interval={recurrenceInterval}
              data-repeat-count={repeatCount}
              data-repeat-until={repeatUntil}
              data-suggestion-state={suggestionState}
            >
              <strong>{recurrenceCadence ? `${recurrenceCadence} recurrence` : 'One-off shift'}</strong>
              <p>
                {#if recurrenceCadence === 'weekly' && recurrenceInterval === '1'}
                  Repeats every week. Repeat bounds stay blank until you choose one.
                {:else if recurrenceCadence}
                  Repeat cadence stays editable until you add a count or end date.
                {:else}
                  Leave this blank for a single shift, or choose a cadence below.
                {/if}
              </p>
            </div>

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
                    on:click={acceptSuggestion}
                  >
                    Use weekly suggestion
                  </button>
                  <button
                    class="button button-secondary recurrence-suggestion__dismiss"
                    type="button"
                    data-testid="recurrence-suggestion-dismiss"
                    on:click={dismissSuggestion}
                  >
                    Dismiss suggestion
                  </button>
                </div>
              </article>
            {/if}

            <div class="calendar-form-grid recurrence-fields__grid">
              <fieldset class="field recurrence-cadence-group">
                <span>Cadence</span>
                <div class="recurrence-cadence-options">
                  <label class={`recurrence-cadence-option ${recurrenceCadence === '' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="recurrenceCadence"
                      value=""
                      checked={recurrenceCadence === ''}
                      on:change={() => setRecurrenceCadence('')}
                    />
                    <strong>One-off</strong>
                    <small>No repeats</small>
                  </label>

                  <label class={`recurrence-cadence-option ${recurrenceCadence === 'daily' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="recurrenceCadence"
                      value="daily"
                      checked={recurrenceCadence === 'daily'}
                      on:change={() => setRecurrenceCadence('daily')}
                    />
                    <strong>Daily</strong>
                    <small>Every day</small>
                  </label>

                  <label class={`recurrence-cadence-option ${recurrenceCadence === 'weekly' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="recurrenceCadence"
                      value="weekly"
                      checked={recurrenceCadence === 'weekly'}
                      on:change={() => setRecurrenceCadence('weekly')}
                    />
                    <strong>Weekly</strong>
                    <small>Weekly cadence</small>
                  </label>

                  <label class={`recurrence-cadence-option ${recurrenceCadence === 'monthly' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="recurrenceCadence"
                      value="monthly"
                      checked={recurrenceCadence === 'monthly'}
                      on:change={() => setRecurrenceCadence('monthly')}
                    />
                    <strong>Monthly</strong>
                    <small>Monthly cadence</small>
                  </label>
                </div>
              </fieldset>

              <label class="field">
                <span>Interval</span>
                <input
                  class="input"
                  type="number"
                  min="1"
                  step="1"
                  name="recurrenceInterval"
                  value={recurrenceInterval}
                  on:input={(event) => updateTextField(event, 'recurrenceInterval')}
                />
              </label>

              <label class="field">
                <span>Repeat count</span>
                <input
                  class="input"
                  type="number"
                  min="1"
                  step="1"
                  name="repeatCount"
                  value={repeatCount}
                  on:input={(event) => updateTextField(event, 'repeatCount')}
                />
              </label>

              <label class="field">
                <span>Repeat until</span>
                <input
                  class="input"
                  type="datetime-local"
                  name="repeatUntil"
                  value={repeatUntil}
                  on:input={(event) => updateTextField(event, 'repeatUntil')}
                />
              </label>
            </div>
          </div>
        {/if}
      </fieldset>

      {#if scopedState}
        <article class={`inline-state ${tone}`} data-testid={`${mode}-state`}>
          <strong>{scopedState.reason}</strong>
          <p>{scopedState.message}</p>
        </article>
      {/if}

      <div class="calendar-form-actions">
        <button class={`button ${mode === 'create' ? 'button-primary' : 'button-secondary'}`} type="submit">
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        <span class="calendar-form-note">
          {mode === 'create'
            ? 'The board updates locally first, then waits for trusted server confirmation when online.'
            : 'The board updates locally first and keeps the trusted server action as the confirmation path.'}
        </span>
      </div>
    </form>
  </div>
</details>
