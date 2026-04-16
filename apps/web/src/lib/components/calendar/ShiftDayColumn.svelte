<script lang="ts">
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { CalendarControllerActionState } from '$lib/offline/calendar-controller';
  import type { ShiftDayColumnModel } from '$lib/schedule/board';
  import ShiftCard from './ShiftCard.svelte';

  type Props = {
    day: ShiftDayColumnModel;
    visibleWeekStart: string;
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    enhanceMutation: (params: {
      action: 'create' | 'edit' | 'move' | 'delete';
      formId: string;
    }) => SubmitFunction;
  };

  let {
    day,
    visibleWeekStart,
    actionStates = [],
    pendingActionKey,
    enhanceMutation
  }: Props = $props();
</script>

<section
  class={`shift-day-column shift-day-column--${day.density} ${day.isToday ? 'shift-day-column--today' : ''} ${day.conflict ? 'shift-day-column--conflict' : ''}`}
  data-conflict-pairs={day.conflict?.overlapCount ?? 0}
  data-testid={`day-shell-${day.dayKey}`}
>
  <header class="shift-day-column__header">
    <div>
      <p class="panel-kicker">{day.weekdayLabel}</p>
      <h3>{day.monthLabel} {day.dayNumberLabel}</h3>
    </div>
    <div class="shift-day-column__pills">
      {#if day.isToday}
        <span class="pill pill-active">Today</span>
      {/if}
      {#if day.conflict}
        <span
          class="pill pill-conflict"
          data-testid={`day-conflict-pill-${day.dayKey}`}
          data-conflict-pairs={day.conflict.overlapCount}
          data-conflict-shifts={day.conflict.conflictingShiftIds.length}
        >
          {day.conflict.label}
        </span>
      {/if}
      <span class="pill pill-neutral">{day.shiftCount} {day.shiftCount === 1 ? 'shift' : 'shifts'}</span>
    </div>
  </header>

  {#if day.isEmpty}
    <article class="empty-card shift-day-column__empty" data-testid={`day-empty-${day.dayKey}`}>
      <p class="panel-kicker">Open capacity</p>
      <h3>Nothing scheduled.</h3>
      <p class="panel-copy">This day stays visible so users can add or move a shift here without losing week context.</p>
    </article>
  {:else}
    <div class="shift-day-column__stack" data-testid={`day-column-${day.dayKey}`}>
      {#if day.conflict}
        <article
          class="inline-state tone-warning shift-day-column__conflict"
          data-testid={`day-conflict-summary-${day.dayKey}`}
          data-conflict-pairs={day.conflict.overlapCount}
          data-conflict-shifts={day.conflict.conflictingShiftIds.length}
        >
          <strong>{day.conflict.label}</strong>
          <p>{day.conflict.detail}</p>
        </article>
      {/if}
      {#each day.shifts as shift}
        <ShiftCard
          {shift}
          {visibleWeekStart}
          {actionStates}
          {pendingActionKey}
          {enhanceMutation}
        />
      {/each}
    </div>
  {/if}
</section>
