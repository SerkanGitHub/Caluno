<script lang="ts">
  import type { CalendarWeekBoardModel } from '@repo/caluno-core/schedule/board';
  import type { CalendarControllerActionState, CalendarScheduleView } from '@repo/caluno-core/schedule/types';
  import type { MobileCalendarControllerState, MobileOfflineRouteMode } from '$lib/offline/controller';
  import ShiftCard from './ShiftCard.svelte';
  import ShiftEditorSheet, { type ShiftEditorSubmitParams } from './ShiftEditorSheet.svelte';
  import SyncStatusStrip from './SyncStatusStrip.svelte';

  type Props = {
    calendarId: string;
    calendarName: string;
    board: CalendarWeekBoardModel;
    schedule: CalendarScheduleView;
    routeMode: MobileOfflineRouteMode;
    controllerState: MobileCalendarControllerState;
    actionStates?: CalendarControllerActionState[];
    pendingActionKey: string | null;
    canMutate: boolean;
    canRefresh: boolean;
    refreshing: boolean;
    retrying: boolean;
    remoteFailure: { status: CalendarScheduleView['status']; reason: string | null; message: string } | null;
    submitMutation: (params: ShiftEditorSubmitParams) => Promise<void>;
    refreshTrustedWeek: () => void | Promise<void>;
    retryDrain: () => void | Promise<void>;
  };

  let {
    calendarId,
    calendarName,
    board,
    schedule,
    routeMode,
    controllerState,
    actionStates = [],
    pendingActionKey,
    canMutate,
    canRefresh,
    refreshing,
    retrying,
    remoteFailure,
    submitMutation,
    refreshTrustedWeek,
    retryDrain
  }: Props = $props();

  const scheduleTone = $derived.by(() => {
    if (!remoteFailure || remoteFailure.status === 'ready') {
      return 'tone-neutral';
    }

    return remoteFailure.status === 'timeout' ? 'tone-warning' : 'tone-danger';
  });
  const boardMetaTone = $derived(board.sourceTone === 'warning' ? 'pill-warning' : 'pill-soft');
  const canRenderBoard = $derived(schedule.status !== 'malformed-response');
</script>

<section
  class="mobile-calendar-board"
  data-testid="mobile-calendar-board"
  data-visible-week-start={board.visibleWeekStart}
  data-visible-week-end={board.visibleWeekEndExclusive}
>
  <header class="board-hero framed-panel">
    <div class="board-hero__copy">
      <p class="panel-kicker">Pocket calendar</p>
      <h2>{calendarName}</h2>
      <p class="lede">{board.rangeLabel}</p>
      <p class="panel-copy">{board.caption}</p>
    </div>

    <div class="board-hero__meta">
      <span class={`pill ${boardMetaTone}`}>{board.sourceLabel}</span>
      <span class="pill pill-deep">{board.totalShifts} {board.totalShifts === 1 ? 'shift' : 'shifts'}</span>
      {#each board.statusBadges as badge}
        <span class={`pill ${badge.tone === 'danger' ? 'pill-danger' : badge.tone === 'warning' ? 'pill-warning' : 'pill-soft'}`}>
          {badge.label}
        </span>
      {/each}
    </div>

    <div class="board-hero__actions">
      <ShiftEditorSheet
        mode="create"
        formId="create:week"
        {calendarId}
        visibleWeekStart={board.visibleWeekStart}
        defaultDayKey={board.days[0]?.dayKey ?? board.visibleWeekStart}
        {actionStates}
        {pendingActionKey}
        canSubmit={canMutate}
        triggerLabel={canMutate ? 'New shift' : 'Read-only continuity'}
        {submitMutation}
      />

      <nav class="week-nav" aria-label="Visible week navigation">
        <a class="button button-secondary" href={`?start=${board.previousWeekStart}`}>Back a week</a>
        <a class="button button-secondary" href={`?start=${board.nextWeekStart}`}>Forward a week</a>
        <a
          class="button button-primary"
          href={`/calendars/${calendarId}/find-time`}
          data-testid="find-time-entrypoint"
        >
          Find time
        </a>
      </nav>
    </div>
  </header>

  {#if remoteFailure && remoteFailure.status !== 'ready'}
    <article class={`status-card framed-panel ${scheduleTone}`} data-testid="calendar-load-state">
      <span class="status-card__label">Trusted week load</span>
      <strong>{remoteFailure.status}</strong>
      <p>{remoteFailure.message}</p>
      {#if remoteFailure.reason}
        <code>{remoteFailure.reason}</code>
      {/if}
    </article>
  {/if}

  {#if controllerState.lastFailure}
    <article class="status-card framed-panel tone-danger" data-testid="calendar-controller-failure">
      <span class="status-card__label">Controller failure</span>
      <strong>{controllerState.lastFailure.reason}</strong>
      <p>{controllerState.lastFailure.detail}</p>
    </article>
  {/if}

  {#if board.conflict}
    <article
      class="status-card framed-panel tone-warning"
      data-testid="board-conflict-summary"
      data-conflict-days={board.conflict.dayCount}
      data-conflict-shifts={board.conflict.shiftCount}
      data-conflict-pairs={board.conflict.overlapCount}
    >
      <span class="status-card__label">Visible-week overlap watch</span>
      <strong>{board.conflict.label}</strong>
      <p>{board.conflict.detail}</p>
    </article>
  {/if}

  <SyncStatusStrip
    {routeMode}
    {controllerState}
    {canRefresh}
    {canMutate}
    {refreshing}
    {retrying}
    onRefresh={refreshTrustedWeek}
    onRetryDrain={retryDrain}
  />

  {#if !canMutate}
    <article class="status-card framed-panel tone-warning" data-testid="mobile-calendar-readonly">
      <span class="status-card__label">Read-only continuity</span>
      <strong>Cached week only</strong>
      <p>This calendar reopened from trusted continuity, but write controls stay disabled until the viewer has an active trusted session again.</p>
    </article>
  {/if}

  {#if canRenderBoard}
    <div class="day-list" data-testid="schedule-week-grid">
      {#each board.days as day}
        <section class="day-column framed-panel" data-testid={`day-column-${day.dayKey}`} data-day-density={day.density}>
          <header class="day-column__header">
            <div>
              <p class="panel-kicker">{day.weekdayLabel}</p>
              <h3>{day.monthLabel} {day.dayNumberLabel}</h3>
            </div>
            <div class="day-column__header-pills">
              {#if day.isToday}
                <span class="pill pill-deep">Today</span>
              {/if}
              <span class={`pill ${day.isEmpty ? 'pill-soft' : 'pill-warning'}`}>{day.shiftCount} {day.shiftCount === 1 ? 'card' : 'cards'}</span>
            </div>
          </header>

          {#if day.conflict}
            <article class="inline-state tone-warning" data-testid={`day-conflict-summary-${day.dayKey}`}>
              <strong>{day.conflict.label}</strong>
              <p>{day.conflict.detail}</p>
            </article>
          {/if}

          {#if day.isEmpty}
            <article class="empty-card" data-testid={`day-empty-${day.dayKey}`}>
              <p class="panel-kicker">Quiet day</p>
              <h4>No shifts on this day yet.</h4>
              <p class="panel-copy">
                {canMutate
                  ? 'Add a shift from the top action or keep the day clear.'
                  : 'This cached continuity reopen is showing the last synced state for the day.'}
              </p>
            </article>
          {:else}
            <div class="day-column__stack">
              {#each day.shifts as shift}
                <ShiftCard
                  {calendarId}
                  visibleWeekStart={board.visibleWeekStart}
                  {shift}
                  {actionStates}
                  {pendingActionKey}
                  {canMutate}
                  {submitMutation}
                />
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {:else}
    <article class="status-card framed-panel tone-danger" data-testid="schedule-malformed-state">
      <span class="status-card__label">Malformed schedule</span>
      <strong>Board withheld</strong>
      <p>The visible week payload could not be trusted, so the phone board stayed closed instead of rendering guessed shifts.</p>
    </article>
  {/if}
</section>

<style>
  .mobile-calendar-board,
  .day-list {
    display: grid;
    gap: 0.95rem;
  }

  .board-hero,
  .status-card,
  .day-column,
  .empty-card {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
  }

  .board-hero__copy,
  .day-column__stack {
    display: grid;
    gap: 0.55rem;
  }

  .board-hero__meta,
  .board-hero__actions,
  .week-nav,
  .day-column__header,
  .day-column__header-pills {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    justify-content: space-between;
  }

  .day-column__header {
    align-items: flex-start;
  }

  .panel-kicker,
  .panel-copy,
  .lede,
  .status-card__label,
  h2,
  h3,
  h4,
  p,
  strong {
    margin: 0;
  }

  .panel-kicker,
  .status-card__label {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--caluno-ink-soft);
  }

  h2 {
    font-size: clamp(1.9rem, 7vw, 2.6rem);
    line-height: 0.94;
  }

  h3 {
    font-size: 1.24rem;
    line-height: 1.04;
  }

  h4 {
    font-size: 1.05rem;
    line-height: 1.1;
  }

  .lede {
    font-size: 1rem;
    font-weight: 700;
    color: var(--caluno-ink-strong);
  }

  .panel-copy,
  .status-card p,
  .empty-card p {
    color: var(--caluno-ink-muted);
    line-height: 1.58;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.88rem 1rem;
    border-radius: 1rem;
    text-decoration: none;
    border: 1px solid rgba(34, 31, 27, 0.08);
    font-weight: 700;
    font-size: 0.94rem;
  }

  .button-secondary {
    background: rgba(255, 255, 255, 0.74);
    color: var(--caluno-ink-strong);
  }

  .status-card strong {
    font-size: 1rem;
  }

  .pill,
  code {
    justify-self: start;
    padding: 0.34rem 0.7rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .pill-deep {
    color: white;
    background: rgba(17, 78, 85, 0.92);
  }

  .pill-soft {
    color: var(--caluno-accent-deep);
    background: rgba(17, 78, 85, 0.08);
  }

  .pill-warning {
    color: #825b14;
    background: rgba(214, 179, 96, 0.18);
  }

  .pill-danger {
    color: #8e2a30;
    background: rgba(184, 77, 88, 0.14);
  }

  .tone-neutral {
    background: rgba(247, 244, 236, 0.92);
  }

  .tone-warning {
    background: rgba(255, 244, 214, 0.94);
  }

  .tone-danger {
    background: rgba(255, 231, 226, 0.94);
  }

  .inline-state {
    display: grid;
    gap: 0.28rem;
    padding: 0.78rem 0.84rem;
    border-radius: 1rem;
    border: 1px solid rgba(34, 31, 27, 0.08);
  }

  .empty-card {
    border-radius: 1.1rem;
    background: rgba(255, 255, 255, 0.74);
  }

  @media (min-width: 48rem) {
    .day-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }
  }

  @media (max-width: 32rem) {
    .week-nav,
    .board-hero__actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .week-nav .button {
      width: 100%;
    }
  }
</style>
