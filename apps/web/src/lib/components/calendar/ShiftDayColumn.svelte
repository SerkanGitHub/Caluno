<script lang="ts">
  import type { ScheduleActionState } from '$lib/server/schedule';
  import type { ShiftDayColumnModel } from '$lib/schedule/board';
  import ShiftCard from './ShiftCard.svelte';

  type Props = {
    day: ShiftDayColumnModel;
    visibleWeekStart: string;
    editState?: ScheduleActionState | null;
    moveState?: ScheduleActionState | null;
    deleteState?: ScheduleActionState | null;
    pendingActionKey: string | null;
    setPendingActionKey: (value: string | null) => void;
  };

  let {
    day,
    visibleWeekStart,
    editState = null,
    moveState = null,
    deleteState = null,
    pendingActionKey,
    setPendingActionKey
  }: Props = $props();
</script>

<section class={`shift-day-column shift-day-column--${day.density} ${day.isToday ? 'shift-day-column--today' : ''}`}>
  <header class="shift-day-column__header">
    <div>
      <p class="panel-kicker">{day.weekdayLabel}</p>
      <h3>{day.monthLabel} {day.dayNumberLabel}</h3>
    </div>
    <div class="shift-day-column__pills">
      {#if day.isToday}
        <span class="pill pill-active">Today</span>
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
      {#each day.shifts as shift}
        <ShiftCard
          {shift}
          {visibleWeekStart}
          {editState}
          {moveState}
          {deleteState}
          {pendingActionKey}
          {setPendingActionKey}
        />
      {/each}
    </div>
  {/if}
</section>
