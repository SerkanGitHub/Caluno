<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import CalendarWeekBoard from '$lib/components/calendar/CalendarWeekBoard.svelte';
  import { buildCalendarWeekBoard } from '$lib/schedule/board';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();
  let pendingActionKey = $state<string | null>(null);

  const shellState = $derived(data.protectedShellState);
  const calendarState = $derived(data.protectedCalendarState);
  const appShell = $derived(data.appShell ?? null);
  const calendarView = $derived(data.calendarView ?? null);
  const readyView = $derived(calendarView?.kind === 'calendar' ? calendarView : null);
  const deniedView = $derived(calendarView?.kind === 'denied' ? calendarView : null);
  const createState = $derived(form?.createShift ?? null);
  const editState = $derived(form?.editShift ?? null);
  const moveState = $derived(form?.moveShift ?? null);
  const deleteState = $derived(form?.deleteShift ?? null);
  const relatedCalendars = $derived.by(() => readyView?.group?.calendars ?? appShell?.calendars ?? []);
  const board = $derived.by(() => (readyView ? buildCalendarWeekBoard(readyView.schedule, { now: new Date() }) : null));
  const viewerName = $derived(appShell?.viewer.displayName ?? 'Protected calendar');
  const routeTone = $derived(
    calendarState.mode === 'offline-denied'
      ? 'tone-danger'
      : calendarState.mode === 'cached-offline'
        ? 'tone-warning'
        : 'tone-neutral'
  );

  function setPendingActionKey(value: string | null) {
    pendingActionKey = value;
  }
</script>

<svelte:head>
  <title>
    {readyView ? `${readyView.calendar.name} • Caluno` : 'Access denied • Caluno'}
  </title>
</svelte:head>

<main class="workspace-shell">
  <aside class="workspace-rail framed-panel">
    <p class="eyebrow">Trusted calendar scope</p>
    <h1>{viewerName}</h1>
    <p class="rail-copy">
      {#if calendarState.mode === 'trusted-online'}
        This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.
      {:else if calendarState.mode === 'cached-offline'}
        This route reopened from trusted browser-local scope and a cached week snapshot without widening access beyond previously synced calendars.
      {:else}
        Offline continuity failed closed on this route instead of guessing whether the calendar should be visible.
      {/if}
    </p>

    <div class="status-stack">
      <article class={`status-card ${routeTone}`} data-testid="calendar-route-state">
        <span class="status-card__label">Route state</span>
        <strong>{calendarState.mode}</strong>
        <p>{calendarState.detail}</p>
        {#if calendarState.reason}
          <code>{calendarState.reason}</code>
        {/if}
      </article>

      {#if calendarState.cachedAt}
        <article class="status-card tone-warning">
          <span class="status-card__label">Cached snapshot</span>
          <strong>{calendarState.cachedAt}</strong>
          <p>The visible week reopened from browser-local storage instead of the server.</p>
        </article>
      {/if}

      {#if calendarView?.welcome}
        <article class="status-card tone-neutral">
          <span class="status-card__label">Onboarding transition</span>
          <strong>{calendarView.welcome}</strong>
          <p>The create/join action redirected into this calendar after the protected shell reloaded.</p>
        </article>
      {/if}

      {#if readyView}
        <article class={`status-card ${readyView.schedule.status === 'ready' ? 'tone-neutral' : readyView.schedule.status === 'timeout' ? 'tone-warning' : 'tone-danger'}`}>
          <span class="status-card__label">Week scope</span>
          <strong>{readyView.schedule.visibleWeek.start}</strong>
          <p>{readyView.schedule.message}</p>
          {#if calendarState.visibleWeekOrigin}
            <code>{calendarState.visibleWeekOrigin}</code>
          {/if}
        </article>
      {/if}
    </div>

    <nav class="rail-links">
      <a href="/groups">Back to groups</a>
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    {#if readyView}
      {#if board}
        <header class="hero-panel compact" data-testid="calendar-shell">
          <p class="eyebrow">{readyView.group?.name ?? 'Permitted calendar'}</p>
          <h2>{readyView.calendar.name}</h2>
          <p class="lede">
            {#if calendarState.mode === 'cached-offline'}
              A calm cached week board reopened from browser-local continuity. It stays scoped to the last trusted calendar inventory on this device.
            {:else}
              A calm week board for multi-shift days: create, edit, move, and delete flows stay on this route and still re-derive calendar authority on the server.
            {/if}
          </p>

          <div class="calendar-board__meta">
            <span class="pill pill-active">{readyView.calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
            <span class="pill pill-neutral">{readyView.group?.role ?? 'member'} access</span>
            <span class="pill pill-neutral">{readyView.schedule.totalShifts} visible shifts</span>
            <span class={`pill ${calendarState.mode === 'cached-offline' ? 'pill-expired' : 'pill-neutral'}`}>
              {calendarState.mode === 'cached-offline' ? 'Cached offline' : 'Trusted online'}
            </span>
          </div>
        </header>

        {#if calendarState.mode === 'cached-offline'}
          <section class="feature-banner tone-warning" data-testid="cached-calendar-banner">
            <span>Offline continuity active</span>
            <p>
              This week is rendering from a trusted cached snapshot. Local-first shift edits arrive in the next slice, so treat this reopen as read-only for now.
            </p>
          </section>
        {/if}

        <CalendarWeekBoard
          {board}
          scheduleStatus={readyView.schedule.status}
          scheduleReason={readyView.schedule.reason}
          scheduleMessage={readyView.schedule.message}
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
          {#if appShell?.primaryCalendar}
            <a class="button button-secondary" href={`/calendars/${appShell.primaryCalendar.id}`}>
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
          <a class={`calendar-link ${readyView && calendar.id === readyView.calendar.id ? 'active' : ''}`} href={`/calendars/${calendar.id}`}>
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          </a>
        {/each}
      </div>
    </section>
  </section>
</main>
