<script lang="ts">
  import type {
    ScheduleActionState,
    ScheduleLoadStatus
  } from '$lib/server/schedule';
  import { summarizeScheduleActions, type CalendarWeekBoardModel } from '$lib/schedule/board';
  import ShiftDayColumn from './ShiftDayColumn.svelte';
  import ShiftEditorDialog from './ShiftEditorDialog.svelte';

  type Props = {
    board: CalendarWeekBoardModel;
    scheduleStatus: ScheduleLoadStatus;
    scheduleReason: string | null;
    scheduleMessage: string;
    createState?: ScheduleActionState | null;
    editState?: ScheduleActionState | null;
    moveState?: ScheduleActionState | null;
    deleteState?: ScheduleActionState | null;
    pendingActionKey: string | null;
    setPendingActionKey: (value: string | null) => void;
  };

  let {
    board,
    scheduleStatus,
    scheduleReason,
    scheduleMessage,
    createState = null,
    editState = null,
    moveState = null,
    deleteState = null,
    pendingActionKey,
    setPendingActionKey
  }: Props = $props();

  const boardTone = $derived.by(() => {
    if (scheduleStatus === 'ready') {
      return 'tone-neutral';
    }

    return scheduleStatus === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
  const canRenderSchedule = $derived(scheduleStatus !== 'malformed-response');
  const actionSummaries = $derived(summarizeScheduleActions([createState, editState, moveState, deleteState]));
</script>

<section class="calendar-week-board framed-panel" data-testid="calendar-week-board" data-visible-week-start={board.visibleWeekStart} data-visible-week-end={board.visibleWeekEndExclusive}>
  <header class="calendar-week-board__header">
    <div>
      <p class="eyebrow">Protected week board</p>
      <h2>{board.rangeLabel}</h2>
      <p class="lede">{board.caption}</p>
    </div>

    <div class="calendar-week-board__header-side">
      <div class="calendar-week-board__meta">
        <span class={`pill pill-neutral ${board.sourceTone === 'warning' ? 'pill-expired' : ''}`}>{board.sourceLabel}</span>
        <span class="pill pill-active">{board.totalShifts} {board.totalShifts === 1 ? 'shift' : 'shifts'}</span>
        <span class="pill pill-neutral">UTC board</span>
      </div>

      <nav class="calendar-week-board__nav" aria-label="Visible week navigation">
        <a class="button button-secondary" href={`?start=${board.previousWeekStart}`}>Previous week</a>
        <a class="button button-secondary" href={`?start=${board.nextWeekStart}`}>Next week</a>
      </nav>
    </div>
  </header>

  <section class="calendar-toolbar">
    <ShiftEditorDialog
      mode="create"
      formId="create:week"
      visibleWeekStart={board.visibleWeekStart}
      actionState={createState}
      defaultDayKey={board.days[0]?.dayKey ?? board.visibleWeekStart}
      {pendingActionKey}
      {setPendingActionKey}
    />

    <div class="calendar-toolbar__notes">
      <p class="panel-kicker">Board rhythm</p>
      <p class="panel-copy">Same-day shifts stay stacked by time, recurring creates stay bounded, and every mutation reruns against server-resolved authority.</p>
    </div>
  </section>

  {#if scheduleStatus !== 'ready'}
    <article class={`status-card ${boardTone}`} data-testid="schedule-load-state">
      <span class="status-card__label">Schedule state</span>
      <strong>{scheduleStatus}</strong>
      <p>{scheduleMessage}</p>
      {#if scheduleReason}
        <code>{scheduleReason}</code>
      {/if}
    </article>
  {/if}

  {#if actionSummaries.length > 0}
    <div class="calendar-action-strip" data-testid="schedule-action-strip">
      {#each actionSummaries as summary}
        <article class={`status-card tone-${summary.tone === 'neutral' ? 'neutral' : summary.tone}`}>
          <span class="status-card__label">{summary.label}</span>
          <strong>{summary.state.status}</strong>
          <p>{summary.state.message}</p>
          <code>{summary.state.reason}</code>
        </article>
      {/each}
    </div>
  {/if}

  {#if canRenderSchedule}
    <div class="calendar-week-grid" data-testid="schedule-week-grid">
      {#each board.days as day}
        <ShiftDayColumn
          {day}
          visibleWeekStart={board.visibleWeekStart}
          {editState}
          {moveState}
          {deleteState}
          {pendingActionKey}
          {setPendingActionKey}
        />
      {/each}
    </div>
  {:else}
    <article class="empty-card calendar-week-board__unavailable" data-testid="schedule-malformed-state">
      <p class="panel-kicker">Non-renderable schedule</p>
      <h3>The week payload could not be trusted.</h3>
      <p class="panel-copy">
        The board stayed on the same calendar route, but the malformed response was withheld instead of rendering broken cards.
      </p>
    </article>
  {/if}
</section>
