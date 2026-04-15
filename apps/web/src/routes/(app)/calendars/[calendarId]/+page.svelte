<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import CalendarWeekBoard from '$lib/components/calendar/CalendarWeekBoard.svelte';
  import { buildCalendarWeekBoard } from '$lib/schedule/board';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();
  let pendingActionKey = $state<string | null>(null);

  const calendarView = $derived(data.calendarView);
  const createState = $derived(form?.createShift ?? null);
  const editState = $derived(form?.editShift ?? null);
  const moveState = $derived(form?.moveShift ?? null);
  const deleteState = $derived(form?.deleteShift ?? null);
  const relatedCalendars = $derived.by(() =>
    calendarView.kind === 'calendar' ? (calendarView.group?.calendars ?? []) : data.appShell.calendars
  );
  const board = $derived.by(() =>
    calendarView.kind === 'calendar' ? buildCalendarWeekBoard(calendarView.schedule, { now: new Date() }) : null
  );
  const deniedView = $derived(calendarView.kind === 'denied' ? calendarView : null);

  function setPendingActionKey(value: string | null) {
    pendingActionKey = value;
  }
</script>

<svelte:head>
  <title>
    {calendarView.kind === 'calendar' ? `${calendarView.calendar.name} • Caluno` : 'Access denied • Caluno'}
  </title>
</svelte:head>

<main class="workspace-shell">
  <aside class="workspace-rail framed-panel">
    <p class="eyebrow">Trusted calendar scope</p>
    <h1>{data.appShell.viewer.displayName}</h1>
    <p class="rail-copy">
      This route still renders only after the server matches the calendar id against the protected membership inventory.
    </p>

    <div class="status-stack">
      <article class={`status-card ${calendarView.kind === 'calendar' ? 'tone-neutral' : 'tone-danger'}`}>
        <span class="status-card__label">Route state</span>
        <strong>{calendarView.kind === 'calendar' ? 'calendar-ready' : 'access-denied'}</strong>
        <p>
          {calendarView.kind === 'calendar'
            ? 'Week data and shift writes stay scoped to the trusted calendar behind this route.'
            : `Failure phase: ${calendarView.failurePhase}`}
        </p>
      </article>

      {#if calendarView.welcome}
        <article class="status-card tone-neutral">
          <span class="status-card__label">Onboarding transition</span>
          <strong>{calendarView.welcome}</strong>
          <p>The create/join action redirected into this calendar after the protected shell reloaded.</p>
        </article>
      {/if}

      {#if calendarView.kind === 'calendar'}
        <article class={`status-card ${calendarView.schedule.status === 'ready' ? 'tone-neutral' : calendarView.schedule.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`}>
          <span class="status-card__label">Week scope</span>
          <strong>{calendarView.schedule.visibleWeek.start}</strong>
          <p>{calendarView.schedule.message}</p>
        </article>
      {/if}
    </div>

    <nav class="rail-links">
      <a href="/groups">Back to groups</a>
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    {#if calendarView.kind === 'calendar'}
      {#if board}
        <header class="hero-panel compact" data-testid="calendar-shell">
          <p class="eyebrow">{calendarView.group?.name ?? 'Permitted calendar'}</p>
          <h2>{calendarView.calendar.name}</h2>
          <p class="lede">
            A calm week board for multi-shift days: create, edit, move, and delete flows stay on this route and still re-derive calendar authority on the server.
          </p>

          <div class="calendar-board__meta">
            <span class="pill pill-active">{calendarView.calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
            <span class="pill pill-neutral">{calendarView.group?.role ?? 'member'} access</span>
            <span class="pill pill-neutral">{calendarView.schedule.totalShifts} visible shifts</span>
          </div>
        </header>

        <CalendarWeekBoard
          {board}
          scheduleStatus={calendarView.schedule.status}
          scheduleReason={calendarView.schedule.reason}
          scheduleMessage={calendarView.schedule.message}
          {createState}
          {editState}
          {moveState}
          {deleteState}
          {pendingActionKey}
          {setPendingActionKey}
        />
      {/if}
    {:else if deniedView}
      <section class="denied-banner framed-panel" data-testid="access-denied-state">
        <p class="eyebrow">{deniedView.detail.badge}</p>
        <h2>{deniedView.detail.title}</h2>
        <p class="lede">{deniedView.detail.detail}</p>

        <div class="denied-meta">
          <div>
            <span>Failure phase</span>
            <strong>{deniedView.failurePhase}</strong>
          </div>
          <div>
            <span>Reason code</span>
            <strong>{deniedView.reason}</strong>
          </div>
          <div>
            <span>Attempted id</span>
            <code>{deniedView.attemptedCalendarId}</code>
          </div>
        </div>

        <div class="denied-actions">
          <a class="button button-primary" href="/groups">Return to permitted groups</a>
          {#if data.appShell.primaryCalendar}
            <a class="button button-secondary" href={`/calendars/${data.appShell.primaryCalendar.id}`}>
              Open a permitted calendar
            </a>
          {/if}
        </div>
      </section>
    {/if}

    <section class="related-panel framed-panel">
      <div class="group-card__header">
        <div>
          <p class="panel-kicker">Visible calendar inventory</p>
          <h3>Only trusted calendars appear in navigation.</h3>
        </div>
        <span class="pill pill-neutral">{relatedCalendars.length} visible</span>
      </div>

      <div class="calendar-list">
        {#each relatedCalendars as calendar}
          <a
            class={`calendar-link ${calendarView.kind === 'calendar' && calendar.id === calendarView.calendar.id ? 'active' : ''}`}
            href={`/calendars/${calendar.id}`}
          >
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          </a>
        {/each}
      </div>
    </section>
  </section>
</main>
