<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { CalendarControllerActionState } from '$lib/offline/calendar-controller';
  import type { ShiftCardModel } from '$lib/schedule/board';
  import ShiftEditorDialog from './ShiftEditorDialog.svelte';

  type Props = {
    shift: ShiftCardModel;
    visibleWeekStart: string;
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    enhanceMutation: (params: {
      action: 'create' | 'edit' | 'move' | 'delete';
      formId: string;
    }) => SubmitFunction;
  };

  let {
    shift,
    visibleWeekStart,
    actionStates = [],
    pendingActionKey,
    enhanceMutation
  }: Props = $props();

  const deleteFormId = $derived(`delete:${shift.id}`);
  const deleteActionTarget = $derived(`?/deleteShift&start=${visibleWeekStart}`);
  const isDeleting = $derived(pendingActionKey === deleteFormId);
  const scopedDeleteState = $derived(actionStates.find((state) => state.formId === deleteFormId) ?? null);
  const deleteTone = $derived.by(() => {
    if (!scopedDeleteState) {
      return 'tone-neutral';
    }

    if (scopedDeleteState.status === 'success') {
      return 'tone-neutral';
    }

    return scopedDeleteState.status === 'pending-local' || scopedDeleteState.status === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
</script>

<article class={`shift-card shift-card--${shift.density}`} data-testid={`shift-card-${shift.id}`}>
  <div class="shift-card__header">
    <div>
      <p class="panel-kicker">{shift.sourceLabel}</p>
      <h3>{shift.title}</h3>
    </div>
    <div class="shift-card__meta-pills">
      <span class="pill pill-neutral">{shift.rangeLabel}</span>
      {#if shift.occurrenceLabel}
        <span class="pill pill-active">{shift.occurrenceLabel}</span>
      {/if}
      {#each shift.statusBadges as badge}
        <span class={`pill ${badge.tone === 'danger' ? 'pill-danger' : badge.tone === 'warning' ? 'pill-expired' : 'pill-neutral'}`}>
          {badge.label}
        </span>
      {/each}
    </div>
  </div>

  <div class="shift-card__stats">
    <div>
      <span>Window</span>
      <strong>{shift.startTimeLabel} → {shift.endTimeLabel}</strong>
    </div>
    <div>
      <span>Duration</span>
      <strong>{shift.durationLabel}</strong>
    </div>
    <div>
      <span>Shift id</span>
      <code>{shift.id}</code>
    </div>
  </div>

  <div class="shift-card__actions">
    <ShiftEditorDialog
      action="edit"
      mode="edit"
      formId={`edit:${shift.id}`}
      {visibleWeekStart}
      {actionStates}
      {shift}
      {pendingActionKey}
      {enhanceMutation}
    />

    <ShiftEditorDialog
      action="move"
      mode="move"
      formId={`move:${shift.id}`}
      {visibleWeekStart}
      {actionStates}
      {shift}
      {pendingActionKey}
      {enhanceMutation}
    />

    <form method="POST" action={deleteActionTarget} use:enhance={enhanceMutation({ action: 'delete', formId: deleteFormId })} class="shift-delete-form">
      <input type="hidden" name="visibleWeekStart" value={visibleWeekStart} />
      <input type="hidden" name="shiftId" value={shift.id} />
      <input type="hidden" name="title" value={shift.title} />
      <input type="hidden" name="startAt" value={shift.startAt} />
      <input type="hidden" name="endAt" value={shift.endAt} />
      <button class="button button-secondary button-danger" type="submit" disabled={isDeleting}>
        {isDeleting ? 'Deleting…' : 'Delete shift'}
      </button>
    </form>
  </div>

  {#if scopedDeleteState}
    <article class={`inline-state ${deleteTone}`} data-testid={`delete-state-${shift.id}`}>
      <strong>{scopedDeleteState.reason}</strong>
      <p>{scopedDeleteState.message}</p>
    </article>
  {/if}
</article>
