<script lang="ts">
  import type { FindTimeWindow } from '$lib/find-time/matcher';
  import type { PageData } from './$types';

  type SurfaceTone = 'tone-neutral' | 'tone-warning' | 'tone-danger';

  type RouteSurfaceState = {
    status: 'trusted-online' | 'ready' | 'no-results' | 'invalid-input' | 'query-failure' | 'timeout' | 'malformed-response' | 'denied' | 'offline-unavailable';
    label: string;
    tone: SurfaceTone;
    reason: string | null;
    message: string;
  };

  const durationPresets = [30, 60, 90, 120] as const;

  let { data }: { data: PageData } = $props();

  const shellState = $derived(data.protectedShellState);
  const appShell = $derived(data.appShell ?? null);
  const browserState = $derived(data.findTimeBrowserState);
  const findTimeView = $derived(data.findTimeView);
  const calendarView = $derived(findTimeView.kind === 'calendar' ? findTimeView : null);
  const deniedView = $derived(findTimeView.kind === 'denied' ? findTimeView : null);
  const search = $derived(calendarView?.search ?? null);
  const viewerName = $derived(appShell?.viewer.displayName ?? 'Protected member');
  const relatedCalendars = $derived.by(() => calendarView?.group?.calendars ?? appShell?.calendars ?? []);
  const selectedDuration = $derived(search?.durationMinutes ? String(search.durationMinutes) : '60');
  const selectedStart = $derived(search?.range.requestedStart ?? search?.range.startAt.slice(0, 10) ?? '');
  const routeState = $derived.by<RouteSurfaceState>(() => {
    if (browserState.status === 'offline-unavailable') {
      return {
        status: 'offline-unavailable',
        label: 'Offline unavailable',
        tone: 'tone-danger',
        reason: browserState.reason,
        message: browserState.message
      };
    }

    if (deniedView) {
      return {
        status: 'denied',
        label: 'Access denied',
        tone: 'tone-danger',
        reason: deniedView.reason,
        message: deniedView.detail.detail
      };
    }

    if (!search) {
      return {
        status: 'trusted-online',
        label: 'Trusted route',
        tone: 'tone-neutral',
        reason: null,
        message: browserState.message
      };
    }

    return {
      status: search.status,
      label: describeSearchStatus(search.status),
      tone: toneForSearchStatus(search.status),
      reason: search.reason,
      message: search.message
    };
  });

  function describeSearchStatus(status: string) {
    switch (status) {
      case 'ready':
        return 'Truthful results';
      case 'no-results':
        return 'No results';
      case 'invalid-input':
        return 'Invalid input';
      case 'query-failure':
        return 'Query failed';
      case 'timeout':
        return 'Query timeout';
      case 'malformed-response':
        return 'Malformed response';
      default:
        return status;
    }
  }

  function toneForSearchStatus(status: string): SurfaceTone {
    switch (status) {
      case 'ready':
        return 'tone-neutral';
      case 'no-results':
      case 'timeout':
        return 'tone-warning';
      default:
        return 'tone-danger';
    }
  }

  function buildPresetHref(calendarId: string, durationMinutes: number, start: string) {
    const searchParams = new URLSearchParams({
      duration: String(durationMinutes)
    });

    if (start) {
      searchParams.set('start', start);
    }

    return `/calendars/${calendarId}/find-time?${searchParams.toString()}`;
  }

  function formatUtcSlot(window: FindTimeWindow) {
    return `${formatUtcDay(window.startAt)} · ${formatUtcClock(window.startAt)}–${formatUtcClock(window.endAt)} UTC`;
  }

  function formatUtcRange(startAt: string, endAt: string) {
    return `${formatUtcDay(startAt)} ${formatUtcClock(startAt)} → ${formatUtcDay(endAt)} ${formatUtcClock(endAt)} UTC`;
  }

  function formatUtcDay(value: string) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  function formatUtcClock(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>{calendarView ? `${calendarView.calendar.name} • Find time • Caluno` : 'Find time • Caluno'}</title>
</svelte:head>

<main class="workspace-shell find-time-layout">
  <aside class="workspace-rail framed-panel">
    <p class="eyebrow">Truthful availability search</p>
    <h1>{viewerName}</h1>
    <p class="rail-copy">
      {#if browserState.status === 'offline-unavailable'}
        This route stays server-backed, so offline navigation fails closed instead of replaying a cached calendar view.
      {:else if calendarView}
        Search windows come from the trusted roster and member-attributed busy intervals already authorized for this calendar.
      {:else}
        The route rejected this calendar before any roster or availability data could be exposed.
      {/if}
    </p>

    <div class="status-stack">
      <article
        class={`status-card ${shellState.mode === 'offline-denied' ? 'tone-danger' : shellState.mode === 'cached-offline' ? 'tone-warning' : 'tone-neutral'}`}
        data-testid="find-time-shell-state"
      >
        <span class="status-card__label">Protected shell</span>
        <strong>{shellState.mode}</strong>
        <p>{shellState.detail}</p>
        {#if shellState.reason}
          <code>{shellState.reason}</code>
        {/if}
      </article>

      <article class={`status-card ${routeState.tone}`} data-testid="find-time-route-state" data-status={routeState.status}>
        <span class="status-card__label">Find-time route</span>
        <strong>{routeState.label}</strong>
        <p>{routeState.message}</p>
        {#if routeState.reason}
          <code>{routeState.reason}</code>
        {/if}
      </article>

      {#if search && browserState.status !== 'offline-unavailable'}
        <article class={`status-card ${toneForSearchStatus(search.status)}`} data-testid="find-time-search-state" data-status={search.status}>
          <span class="status-card__label">Search diagnostics</span>
          <strong>{search.status}</strong>
          <p>{search.message}</p>
          <code>{search.reason ?? 'none'}</code>
        </article>

        <article class="status-card tone-neutral" data-testid="find-time-scope-state">
          <span class="status-card__label">Trusted scope</span>
          <strong>{search.range.startAt.slice(0, 10)} → {search.range.endAt.slice(0, 10)}</strong>
          <p>
            {search.durationMinutes ?? 0} minute search over {search.roster.length} named member{search.roster.length === 1 ? '' : 's'}.
          </p>
          <code>{search.totalWindows} windows</code>
        </article>
      {/if}
    </div>

    <nav class="rail-links">
      {#if calendarView}
        <a href={`/calendars/${calendarView.calendar.id}`}>Back to calendar board</a>
      {:else if appShell?.primaryCalendar}
        <a href={`/calendars/${appShell.primaryCalendar.id}`}>Open a permitted calendar</a>
      {/if}
      <a href="/groups">Open groups</a>
      <a href="/logout">Sign out</a>
    </nav>
  </aside>

  <section class="workspace-main">
    {#if browserState.status === 'offline-unavailable'}
      <section class="denied-banner framed-panel" data-testid="find-time-offline-state">
        <p class="eyebrow">Offline unavailable</p>
        <h2>Find-time stays server-only when this browser goes offline.</h2>
        <p class="lede">{browserState.message}</p>

        <div class="denied-meta">
          <div>
            <span>Route state</span>
            <strong>offline-unavailable</strong>
          </div>
          <div>
            <span>Reason code</span>
            <strong>{browserState.reason ?? 'none'}</strong>
          </div>
          <div>
            <span>Policy</span>
            <strong>fail-closed</strong>
          </div>
        </div>

        <div class="denied-actions">
          {#if appShell?.primaryCalendar}
            <a class="button button-primary" href={`/calendars/${appShell.primaryCalendar.id}`}>Return to a trusted calendar</a>
          {/if}
          <a class="button button-secondary" href="/groups">Open groups</a>
        </div>
      </section>
    {:else if deniedView}
      <section class="denied-banner framed-panel" data-testid="find-time-denied-state">
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
            <a class="button button-secondary" href={`/calendars/${appShell.primaryCalendar.id}`}>Open a permitted calendar</a>
          {/if}
        </div>
      </section>
    {:else if calendarView && search}
      <header class="hero-panel compact find-time-hero" data-testid="find-time-shell">
        <div class="find-time-hero__copy">
          <p class="eyebrow">{calendarView.group?.name ?? 'Permitted calendar'}</p>
          <h2>{calendarView.calendar.name}</h2>
          <p class="lede">
            Browse truthful windows from named member availability. Every card below is shaped from the protected server contract for the next 30 days only.
          </p>
        </div>

        <div class="find-time-hero__meta">
          <span class="pill pill-active">{calendarView.calendar.isDefault ? 'Default calendar' : 'Secondary calendar'}</span>
          <span class="pill pill-neutral">{calendarView.group?.role ?? 'member'} access</span>
          <span class={`pill ${routeState.tone === 'tone-danger' ? 'pill-danger' : routeState.tone === 'tone-warning' ? 'pill-expired' : 'pill-neutral'}`}>
            {routeState.status}
          </span>
          <span class="pill pill-neutral">{search.roster.length} named members</span>
        </div>
      </header>

      <section class="find-time-toolbar framed-panel">
        <div class="find-time-toolbar__copy">
          <p class="panel-kicker">Search the protected 30-day horizon</p>
          <h3>Move the window, keep the scope.</h3>
          <p class="panel-copy">
            Duration and start anchor stay explicit. Invalid values, empty results, and query failures never collapse into the same UI state.
          </p>
        </div>

        <form method="GET" class="stacked-form find-time-form" data-testid="find-time-query-form">
          <div class="find-time-form__grid">
            <label class="field">
              <span>Duration (minutes)</span>
              <input
                class="input"
                data-testid="find-time-duration-input"
                type="number"
                min="15"
                max="720"
                step="15"
                name="duration"
                value={selectedDuration}
                required
              />
            </label>

            <label class="field">
              <span>Search from (UTC day)</span>
              <input
                class="input"
                data-testid="find-time-start-input"
                type="date"
                name="start"
                value={selectedStart}
              />
            </label>
          </div>

          <div class="find-time-presets" aria-label="Duration presets">
            {#each durationPresets as preset}
              <a
                class={`pill ${selectedDuration === String(preset) ? 'pill-active' : 'pill-neutral'}`}
                href={buildPresetHref(calendarView.calendar.id, preset, selectedStart)}
              >
                {preset} min
              </a>
            {/each}
          </div>

          <div class="hero-actions">
            <button class="button button-primary" data-testid="find-time-submit" type="submit">Refresh truthful windows</button>
            <a class="button button-secondary" href={`/calendars/${calendarView.calendar.id}`}>Back to board</a>
          </div>
        </form>
      </section>

      {#if search.status === 'ready'}
        <section class="find-time-summary-grid">
          <article class="status-card tone-neutral" data-testid="find-time-summary">
            <span class="status-card__label">Window inventory</span>
            <strong>{search.totalWindows} truthful window{search.totalWindows === 1 ? '' : 's'}</strong>
            <p>
              Exact cards show the requested slot first, then the wider continuous span that still remains free for the same member set.
            </p>
          </article>

          <article class="status-card tone-neutral">
            <span class="status-card__label">Roster names</span>
            <strong>{search.roster.map((member) => member.displayName).join(' · ')}</strong>
            <p>Only names already authorized for this calendar scope appear in the browse list.</p>
          </article>
        </section>

        {#if search.truncated}
          <section class="feature-banner tone-warning" data-testid="find-time-truncated-state">
            <span>Result list trimmed</span>
            <p>
              The browse list stayed compact after {search.windows.length} cards even though {search.totalWindows} windows matched.
            </p>
          </section>
        {/if}

        <section class="find-time-results" data-testid="find-time-results" data-window-count={search.totalWindows}>
          {#each search.windows as window, index}
            <article
              class="framed-panel find-time-card"
              data-testid={`find-time-window-${index}`}
              data-start-at={window.startAt}
              data-end-at={window.endAt}
              data-span-start-at={window.spanStartAt}
              data-span-end-at={window.spanEndAt}
              data-available-members={window.availableMembers.map((member) => member.displayName).join('|')}
            >
              <div class="find-time-card__header">
                <div>
                  <p class="panel-kicker">Window {index + 1}</p>
                  <h3>{formatUtcSlot(window)}</h3>
                </div>
                <span class={`pill ${window.busyMemberCount === 0 ? 'pill-active' : 'pill-neutral'}`}>
                  {window.availableMembers.length} free / {window.busyMemberCount} busy
                </span>
              </div>

              <div class="find-time-card__meta">
                <div>
                  <span>Exact slot</span>
                  <strong>{formatUtcRange(window.startAt, window.endAt)}</strong>
                </div>
                <div>
                  <span>Continuous span</span>
                  <strong>{formatUtcRange(window.spanStartAt, window.spanEndAt)}</strong>
                </div>
                <div>
                  <span>Span length</span>
                  <strong>{window.spanDurationMinutes} minutes</strong>
                </div>
              </div>

              <div class="find-time-members">
                <p class="panel-kicker">Available members</p>
                <ul class="find-time-member-list">
                  {#each window.availableMembers as member}
                    <li>{member.displayName}</li>
                  {/each}
                </ul>
              </div>
            </article>
          {/each}
        </section>
      {:else if search.status === 'no-results'}
        <section class="feature-banner tone-warning" data-testid="find-time-empty-state">
          <span>No truthful windows</span>
          <p>{search.message}</p>
        </section>
      {:else}
        <section class={`feature-banner ${toneForSearchStatus(search.status)}`} data-testid="find-time-error-state" data-status={search.status}>
          <span>{describeSearchStatus(search.status)}</span>
          <p>{search.message}</p>
        </section>
      {/if}
    {/if}

    <section class="related-panel framed-panel">
      <div class="group-card__header">
        <div>
          <p class="panel-kicker">Visible calendar inventory</p>
          <h3>Jump only within the calendars your session can already prove.</h3>
        </div>
        <span class="pill pill-neutral">{relatedCalendars.length} visible</span>
      </div>

      <div class="calendar-list">
        {#each relatedCalendars as calendar}
          <a
            class={`calendar-link ${calendarView && calendar.id === calendarView.calendar.id ? 'active' : ''}`}
            href={`/calendars/${calendar.id}/find-time?duration=${selectedDuration}&start=${selectedStart}`}
          >
            <strong>{calendar.name}</strong>
            <span>{calendar.isDefault ? 'Default calendar' : 'Secondary calendar'} • find-time</span>
          </a>
        {/each}
      </div>
    </section>
  </section>
</main>

<style>
  .find-time-layout {
    align-items: start;
  }

  .find-time-hero,
  .find-time-toolbar,
  .find-time-summary-grid,
  .find-time-results,
  .find-time-card,
  .find-time-card__header,
  .find-time-card__meta,
  .find-time-form,
  .find-time-form__grid,
  .find-time-presets,
  .find-time-members,
  .find-time-member-list {
    display: grid;
    gap: 1rem;
  }

  .find-time-hero {
    background:
      radial-gradient(circle at top right, rgba(244, 162, 89, 0.18), transparent 32%),
      linear-gradient(180deg, rgba(12, 22, 35, 0.95), rgba(7, 16, 26, 0.9));
  }

  .find-time-hero__meta,
  .find-time-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .find-time-toolbar {
    grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.2fr);
    align-items: start;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 45%),
      rgba(255, 255, 255, 0.025);
  }

  .find-time-form__grid,
  .find-time-summary-grid,
  .find-time-card__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .find-time-results {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .find-time-card {
    align-content: start;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(7, 16, 26, 0.75);
  }

  .find-time-card__header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .find-time-card__meta > div,
  .find-time-members {
    padding: 0.95rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
  }

  .find-time-card__meta span {
    display: block;
    margin-bottom: 0.35rem;
    font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
    font-size: 0.77rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .find-time-card__meta strong {
    line-height: 1.5;
  }

  .find-time-member-list {
    list-style: none;
    padding: 0;
    margin: 0;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .find-time-member-list li {
    padding: 0.8rem 0.95rem;
    border-radius: 999px;
    border: 1px solid rgba(143, 211, 193, 0.24);
    background: rgba(143, 211, 193, 0.08);
  }

  @media (max-width: 980px) {
    .find-time-toolbar,
    .find-time-form__grid,
    .find-time-summary-grid,
    .find-time-card__meta,
    .find-time-card__header {
      grid-template-columns: 1fr;
    }
  }
</style>
