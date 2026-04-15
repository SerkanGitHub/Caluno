<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { ScheduleActionState } from '$lib/server/schedule';
  import { buildDefaultCreateTimes, toDateTimeLocalValue } from '$lib/schedule/board';
  import type { ShiftCardModel } from '$lib/schedule/board';

  type Mode = 'create' | 'edit' | 'move';

  type Props = {
    mode: Mode;
    formId: string;
    visibleWeekStart: string;
    actionState?: ScheduleActionState | null;
    shift?: ShiftCardModel | null;
    defaultDayKey?: string | null;
    pendingActionKey: string | null;
    setPendingActionKey: (value: string | null) => void;
  };

  let {
    mode,
    formId,
    visibleWeekStart,
    actionState = null,
    shift = null,
    defaultDayKey = null,
    pendingActionKey,
    setPendingActionKey
  }: Props = $props();

  const defaultTimes = $derived(buildDefaultCreateTimes(defaultDayKey));
  const isSubmitting = $derived(pendingActionKey === formId);
  const actionTarget = $derived(`?/${mode === 'create' ? 'createShift' : mode === 'edit' ? 'editShift' : 'moveShift'}&start=${visibleWeekStart}`);
  const tone = $derived.by(() => {
    if (!actionState) {
      return 'tone-neutral';
    }

    if (actionState.status === 'success') {
      return 'tone-neutral';
    }

    return actionState.status === 'timeout' ? 'tone-warning' : 'tone-danger';
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

    return actionState?.fields.title ?? shift?.title ?? '';
  });
  const startValue = $derived.by(() => actionState?.fields.startAt ?? toDateTimeLocalValue(shift?.startAt) ?? defaultTimes.startAt);
  const endValue = $derived.by(() => actionState?.fields.endAt ?? toDateTimeLocalValue(shift?.endAt) ?? defaultTimes.endAt);
  const cadenceValue = $derived(actionState?.fields.recurrenceCadence ?? '');
  const intervalValue = $derived(actionState?.fields.recurrenceInterval ?? '1');
  const repeatCountValue = $derived(actionState?.fields.repeatCount ?? '');
  const repeatUntilValue = $derived(actionState?.fields.repeatUntil ?? '');

  function matchesCurrentSurface(state: ScheduleActionState | null, mode: Mode, shiftId: string | null): boolean {
    if (!state) {
      return false;
    }

    if (state.action !== mode) {
      return false;
    }

    if (mode === 'create') {
      return true;
    }

    return state.shiftId === shiftId;
  }

  const scopedState = $derived(matchesCurrentSurface(actionState, mode, shift?.id ?? null) ? actionState : null);

  const enhanceWithPending: SubmitFunction = () => {
    setPendingActionKey(formId);

    return async ({ update }) => {
      setPendingActionKey(null);
      await update({ reset: false });
    };
  };
</script>

<details class={`shift-editor ${mode === 'create' ? 'shift-editor--create' : ''}`}>
  <summary class={`button ${mode === 'create' ? 'button-primary' : 'button-secondary'}`}>{summaryLabel}</summary>

  <div class="shift-editor__panel framed-panel">
    <div class="shift-editor__header">
      <div>
        <p class="panel-kicker">{mode === 'create' ? 'Server-backed create' : mode === 'edit' ? 'Trusted edit' : 'Trusted move'}</p>
        <h3>{heading}</h3>
      </div>
      <span class="pill pill-neutral">UTC times</span>
    </div>

    <form method="POST" action={actionTarget} use:enhance={enhanceWithPending} class="stacked-form">
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
                  <label class={`recurrence-cadence-option ${cadenceValue === '' ? 'is-selected' : ''}`}>
                    <input type="radio" name="recurrenceCadence" value="" checked={cadenceValue === ''} />
                    <strong>One-off</strong>
                    <small>No repeats</small>
                  </label>

                  <label class={`recurrence-cadence-option ${cadenceValue === 'daily' ? 'is-selected' : ''}`}>
                    <input type="radio" name="recurrenceCadence" value="daily" checked={cadenceValue === 'daily'} />
                    <strong>Daily</strong>
                    <small>Every day</small>
                  </label>

                  <label class={`recurrence-cadence-option ${cadenceValue === 'weekly' ? 'is-selected' : ''}`}>
                    <input type="radio" name="recurrenceCadence" value="weekly" checked={cadenceValue === 'weekly'} />
                    <strong>Weekly</strong>
                    <small>Weekly cadence</small>
                  </label>

                  <label class={`recurrence-cadence-option ${cadenceValue === 'monthly' ? 'is-selected' : ''}`}>
                    <input type="radio" name="recurrenceCadence" value="monthly" checked={cadenceValue === 'monthly'} />
                    <strong>Monthly</strong>
                    <small>Monthly cadence</small>
                  </label>
                </div>
              </fieldset>

              <label class="field">
                <span>Interval</span>
                <input class="input" type="number" min="1" step="1" name="recurrenceInterval" value={intervalValue} />
              </label>

              <label class="field">
                <span>Repeat count</span>
                <input class="input" type="number" min="1" step="1" name="repeatCount" value={repeatCountValue} />
              </label>

              <label class="field">
                <span>Repeat until</span>
                <input class="input" type="datetime-local" name="repeatUntil" value={repeatUntilValue} />
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
            ? 'Successful saves rerender the visible week from server data.'
            : 'This write re-validates calendar and shift authority on the server.'}
        </span>
      </div>
    </form>
  </div>
</details>
