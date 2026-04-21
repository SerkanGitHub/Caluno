<script lang="ts">
  import { buildDefaultCreateTimes, toDateTimeLocalValue, type ShiftCardModel } from '@repo/caluno-core/schedule/board';
  import type { CalendarControllerActionState } from '@repo/caluno-core/schedule/types';

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
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    canSubmit: boolean;
    triggerLabel?: string;
    submitMutation: (params: ShiftEditorSubmitParams) => Promise<void>;
  };

  let {
    mode,
    formId,
    calendarId,
    visibleWeekStart,
    shift = null,
    defaultDayKey = null,
    actionStates = [],
    pendingActionKey,
    canSubmit,
    triggerLabel = '',
    submitMutation
  }: Props = $props();

  let open = $state(false);
  let lastSeedKey = $state<string | null>(null);
  let handledStateId = $state<string | null>(null);
  let draftTitle = $state('');
  let draftStartAt = $state('');
  let draftEndAt = $state('');
  let recurrenceCadence = $state('');
  let recurrenceInterval = $state('');
  let repeatCount = $state('');
  let repeatUntil = $state('');

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
  const seedKey = $derived.by(() => {
    if (mode === 'create') {
      return `create:${defaultDayKey ?? visibleWeekStart}`;
    }

    return `${mode}:${shift?.id ?? 'unknown'}:${shift?.startAt ?? 'none'}:${shift?.endAt ?? 'none'}`;
  });
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
      draftStartAt = defaultTimes.startAt;
      draftEndAt = defaultTimes.endAt;
      recurrenceCadence = '';
      recurrenceInterval = '';
      repeatCount = '';
      repeatUntil = '';
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

  $effect(() => {
    if (lastSeedKey === seedKey) {
      return;
    }

    lastSeedKey = seedKey;
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
      open = false;
      if (mode === 'create' && (scopedState.status === 'success' || scopedState.status === 'pending-local')) {
        reseedDraft();
      }
    }
  });
</script>

<button
  class={`button ${mode === 'create' ? 'button-primary' : mode === 'delete' ? 'button-danger' : 'button-secondary'}`}
  type="button"
  onclick={() => (open = true)}
  disabled={!canSubmit && mode === 'create'}
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
        <form class="shift-editor-sheet__form" onsubmit={handleSubmit}>
          {#if mode !== 'move'}
            <label class="field">
              <span>Title</span>
              <input class="input" name="title" bind:value={draftTitle} placeholder="Opening shift" required />
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
              <input class="input" type="datetime-local" name="startAt" bind:value={draftStartAt} required />
            </label>
            <label class="field">
              <span>End</span>
              <input class="input" type="datetime-local" name="endAt" bind:value={draftEndAt} required />
            </label>
          </div>

          {#if mode === 'create'}
            <div class="recurrence-block">
              <div class="recurrence-block__header">
                <div>
                  <p class="panel-kicker">Optional recurrence</p>
                  <h4>Bound the repeat locally</h4>
                </div>
                <span class="pill">Count or until required</span>
              </div>

              <div class="calendar-form-grid recurrence-block__grid">
                <label class="field">
                  <span>Cadence</span>
                  <select class="input" name="recurrenceCadence" bind:value={recurrenceCadence}>
                    <option value="">One-off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <label class="field">
                  <span>Interval</span>
                  <input class="input" type="number" min="1" step="1" name="recurrenceInterval" bind:value={recurrenceInterval} />
                </label>
                <label class="field">
                  <span>Repeat count</span>
                  <input class="input" type="number" min="1" step="1" name="repeatCount" bind:value={repeatCount} />
                </label>
                <label class="field">
                  <span>Repeat until</span>
                  <input class="input" type="datetime-local" name="repeatUntil" bind:value={repeatUntil} />
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
        <button class="button button-secondary" type="button" onclick={closeSheet}>Keep browsing</button>
        <button class={`button ${mode === 'delete' ? 'button-danger' : 'button-primary'}`} type="button" onclick={(event) => handleSubmit(event as unknown as SubmitEvent)} disabled={!canSubmit || isSubmitting}>
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
  .recurrence-block__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .shift-editor-sheet__header,
  .recurrence-block__header {
    align-items: flex-start;
  }

  .shift-editor-sheet__form,
  .recurrence-block,
  .field,
  .facts-grid,
  .compact,
  .code-strip,
  .inline-state {
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
  span {
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
  dd {
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

  .inline-state {
    padding: 0.82rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
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
    .shift-editor-sheet__footer {
      grid-template-columns: 1fr;
    }

    .shift-editor-sheet__footer {
      display: grid;
    }
  }
</style>
