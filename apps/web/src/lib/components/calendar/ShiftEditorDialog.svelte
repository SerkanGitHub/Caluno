<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { CalendarControllerActionState } from '$lib/offline/calendar-controller';
  import { buildDefaultCreateTimes, toDateTimeLocalValue } from '$lib/schedule/board';
  import type { ShiftCardModel } from '$lib/schedule/board';

  type Mode = 'create' | 'edit' | 'move';

  type Props = {
    action: Mode;
    mode: Mode;
    formId: string;
    visibleWeekStart: string;
    actionStates?: CalendarControllerActionState[];
    shift?: ShiftCardModel | null;
    defaultDayKey?: string | null;
    pendingActionKey: string | null;
    enhanceMutation: (params: {
      action: 'create' | 'edit' | 'move' | 'delete';
      formId: string;
    }) => SubmitFunction;
  };

  let {
    action,
    mode,
    formId,
    visibleWeekStart,
    actionStates = [],
    shift = null,
    defaultDayKey = null,
    pendingActionKey,
    enhanceMutation
  }: Props = $props();

  const defaultTimes = $derived(buildDefaultCreateTimes(defaultDayKey));
  const isSubmitting = $derived(pendingActionKey === formId);
  const actionTarget = $derived(`?/${mode === 'create' ? 'createShift' : mode === 'edit' ? 'editShift' : 'moveShift'}&start=${visibleWeekStart}`);
  const scopedState = $derived(actionStates.find((state) => state.formId === formId) ?? null);
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
  const startValue = $derived.by(() => toDateTimeLocalValue(shift?.startAt) || defaultTimes.startAt);
  const endValue = $derived.by(() => toDateTimeLocalValue(shift?.endAt) || defaultTimes.endAt);
</script>

<details class={`shift-editor ${mode === 'create' ? 'shift-editor--create' : ''}`}>
  <summary class={`button ${mode === 'create' ? 'button-primary' : 'button-secondary'}`}>{summaryLabel}</summary>

  <div class="shift-editor__panel framed-panel">
    <div class="shift-editor__header">
      <div>
        <p class="panel-kicker">{mode === 'create' ? 'Local-first create' : mode === 'edit' ? 'Local-first edit' : 'Local-first move'}</p>
        <h3>{heading}</h3>
      </div>
      <span class="pill pill-neutral">UTC times</span>
    </div>

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

            <div class="calendar-form-grid recurrence-fields__grid">
              <fieldset class="field recurrence-cadence-group">
                <span>Cadence</span>
                <div class="recurrence-cadence-options">
                  <label class="recurrence-cadence-option is-selected">
                    <input type="radio" name="recurrenceCadence" value="" checked />
                    <strong>One-off</strong>
                    <small>No repeats</small>
                  </label>

                  <label class="recurrence-cadence-option">
                    <input type="radio" name="recurrenceCadence" value="daily" />
                    <strong>Daily</strong>
                    <small>Every day</small>
                  </label>

                  <label class="recurrence-cadence-option">
                    <input type="radio" name="recurrenceCadence" value="weekly" />
                    <strong>Weekly</strong>
                    <small>Weekly cadence</small>
                  </label>

                  <label class="recurrence-cadence-option">
                    <input type="radio" name="recurrenceCadence" value="monthly" />
                    <strong>Monthly</strong>
                    <small>Monthly cadence</small>
                  </label>
                </div>
              </fieldset>

              <label class="field">
                <span>Interval</span>
                <input class="input" type="number" min="1" step="1" name="recurrenceInterval" value="" />
              </label>

              <label class="field">
                <span>Repeat count</span>
                <input class="input" type="number" min="1" step="1" name="repeatCount" value="" />
              </label>

              <label class="field">
                <span>Repeat until</span>
                <input class="input" type="datetime-local" name="repeatUntil" value="" />
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
