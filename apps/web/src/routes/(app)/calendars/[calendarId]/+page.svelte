<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const calendarView = $derived(data.calendarView);
  const relatedCalendars = $derived.by(() =>
    calendarView.kind === 'calendar' ? (calendarView.group?.calendars ?? []) : data.appShell.calendars
  );
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
      This calendar route rendered only after checking the id against the server-resolved membership scope.
    </p>

    <div class="status-stack">
      <article class={`status-card ${calendarView.kind === 'calendar' ? 'tone-neutral' : 'tone-danger'}`}>
        <span class="status-card__label">Route state</span>
        <strong>{calendarView.kind === 'calendar' ? 'calendar-ready' : 'access-denied'}</strong>
        <p>
          {calendarView.kind === 'calendar'
            ? 'The requested calendar was found inside the trusted app-shell inventory.'
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
    </div>

    <nav class="rail-links">
      <a href="/groups">Back to groups</a>
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    {#if calendarView.kind === 'calendar'}
      <header class="hero-panel compact" data-testid="calendar-shell">
        <p class="eyebrow">{calendarView.group?.name ?? 'Permitted calendar'}</p>
        <h2>{calendarView.calendar.name}</h2>
        <p class="lede">
          This shell is intentionally narrow: the route resolved from trusted membership data, not from a client-submitted group id.
        </p>
      </header>

      <section class="calendar-board framed-panel">
        <div class="calendar-board__meta">
          <span class="pill pill-active">{calendarView.calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          <span class="pill pill-neutral">{calendarView.group?.role ?? 'member'} access</span>
        </div>

        <div class="timeline-grid">
          <article>
            <span>Guardrail</span>
            <strong>Server-resolved</strong>
            <p>Opened only after the route id matched the protected layout inventory.</p>
          </article>
          <article>
            <span>Next slice</span>
            <strong>Scheduling canvas</strong>
            <p>Shift planning and event details layer onto this permitted shell in later milestone work.</p>
          </article>
          <article>
            <span>Failure mode</span>
            <strong>Fail closed</strong>
            <p>Guessed or malformed ids render a named denial surface instead of empty calendar data.</p>
          </article>
        </div>
      </section>
    {:else}
      <section class="denied-banner framed-panel" data-testid="access-denied-state">
        <p class="eyebrow">{calendarView.detail.badge}</p>
        <h2>{calendarView.detail.title}</h2>
        <p class="lede">{calendarView.detail.detail}</p>

        <div class="denied-meta">
          <div>
            <span>Failure phase</span>
            <strong>{calendarView.failurePhase}</strong>
          </div>
          <div>
            <span>Reason code</span>
            <strong>{calendarView.reason}</strong>
          </div>
          <div>
            <span>Attempted id</span>
            <code>{calendarView.attemptedCalendarId}</code>
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
