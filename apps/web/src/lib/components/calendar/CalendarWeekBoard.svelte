<script lang="ts">
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { CalendarControllerActionState } from '$lib/offline/calendar-controller';
  import type { ScheduleLoadStatus } from '$lib/server/schedule';
  import { summarizeScheduleActions, type CalendarWeekBoardModel } from '$lib/schedule/board';
  import ShiftDayColumn from './ShiftDayColumn.svelte';
  import ShiftEditorDialog from './ShiftEditorDialog.svelte';

  type Props = {
    board: CalendarWeekBoardModel;
    scheduleStatus: ScheduleLoadStatus;
    scheduleReason: string | null;
    scheduleMessage: string;
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    enhanceMutation: (params: {
      action: 'create' | 'edit' | 'move' | 'delete';
      formId: string;
    }) => SubmitFunction;
  };

  let {
    board,
    scheduleStatus,
    scheduleReason,
    scheduleMessage,
    actionStates = [],
    pendingActionKey,
    enhanceMutation
  }: Props = $props();

  const boardTone = $derived.by(() => {
    if (scheduleStatus === 'ready') {
      return 'tone-neutral';
    }

    return scheduleStatus === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
  const canRenderSchedule = $derived(scheduleStatus !== 'malformed-response');
  const actionSummaries = $derived(summarizeScheduleActions(actionStates));
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
        {#each board.statusBadges as badge}
          <span class={`pill ${badge.tone === 'danger' ? 'pill-danger' : badge.tone === 'warning' ? 'pill-expired' : badge.tone === 'success' ? 'pill-active' : 'pill-neutral'}`}>
            {badge.label}
          </span>
        {/each}
      </div>

      <nav class="calendar-week-board__nav" aria-label="Visible week navigation">
        <a class="button button-secondary" href={`?start=${board.previousWeekStart}`}>Previous week</a>
        <a class="button button-secondary" href={`?start=${board.nextWeekStart}`}>Next week</a>
      </nav>
    </div>
  </header>

  <section class="calendar-toolbar">
    <ShiftEditorDialog
      action="create"
      mode="create"
      formId="create:week"
      visibleWeekStart={board.visibleWeekStart}
      actionStates={actionStates}
      defaultDayKey={board.days[0]?.dayKey ?? board.visibleWeekStart}
      {pendingActionKey}
      {enhanceMutation}
    />

    <div class="calendar-toolbar__notes">
      <p class="panel-kicker">Board rhythm</p>
      <p class="panel-copy">Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.</p>
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

  {#if board.lastFailure}
    <article class="status-card tone-danger" data-testid="local-write-failure">
      <span class="status-card__label">Local-first failure</span>
      <strong>{board.lastFailure.reason}</strong>
      <p>{board.lastFailure.detail}</p>
    </article>
  {/if}

  <article
    class={`status-card ${
      board.lastSyncError ? 'tone-danger' : board.syncPhaseLabel === 'Sync draining reconnect queue' ? 'tone-warning' : 'tone-neutral'
    }`}
    data-testid="board-sync-diagnostics"
  >
    <span class="status-card__label">Board sync diagnostics</span>
    <strong>{board.syncPhaseLabel}</strong>
    <p>
      {#if board.lastSyncAttemptLabel}
        Last reconnect attempt: <code>{board.lastSyncAttemptLabel}</code>
      {:else}
        No reconnect attempt has been recorded on this route yet.
      {/if}
    </p>
    {#if board.lastSyncError}
      <p>{board.lastSyncError.detail}</p>
      <code>{board.lastSyncError.reason}</code>
    {/if}
  </article>

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
          {actionStates}
          {pendingActionKey}
          {enhanceMutation}
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
