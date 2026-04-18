<script lang="ts">
  import type { FindTimeWindow } from '$lib/find-time/matcher';
  import type { FindTimeBlockedMember, FindTimeNearbyConstraint } from '$lib/find-time/ranking';
  import { buildCreatePrefillHref, deriveCreatePrefillWeekStart } from '$lib/schedule/create-prefill';
  import type { PageData } from './$types';

  type SurfaceTone = 'tone-neutral' | 'tone-warning' | 'tone-danger';

  type RouteSurfaceState = {
    status:
      | 'trusted-online'
      | 'ready'
      | 'no-results'
      | 'invalid-input'
      | 'query-failure'
      | 'timeout'
      | 'malformed-response'
      | 'denied'
      | 'offline-unavailable';
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

  function buildSuggestionCreateHref(window: FindTimeWindow) {
    if (!calendarView) {
      return null;
    }

    return buildCreatePrefillHref({
      calendarId: calendarView.calendar.id,
      window
    });
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

  function serializeNames(values: string[]) {
    return values.join('|');
  }

  function serializeNearbyConstraints(constraints: FindTimeNearbyConstraint[]) {
    return constraints.map((constraint) => `${constraint.memberName}:${constraint.shiftTitle}:${constraint.distanceMinutes}`).join('|');
  }

  function availableMemberNames(window: FindTimeWindow) {
    return window.availableMembers.map((member) => member.displayName);
  }

  function blockedMemberNames(window: FindTimeWindow) {
    return window.blockedMembers.map((member) => member.displayName);
  }

  function nearbyConstraintCount(window: FindTimeWindow) {
    return window.nearbyConstraints.leading.length + window.nearbyConstraints.trailing.length;
  }

  function topPickHeadline(window: FindTimeWindow) {
    if (window.blockedMembers.length === 0) {
      return `All ${window.availableMembers.length} named members stay free across this slot and the nearby edges remain unconstrained.`;
    }

    return `${window.availableMembers.length} named members align while ${window.blockedMembers.length} blocked member${window.blockedMembers.length === 1 ? '' : 's'} explain the nearby exclusions.`;
  }

  function browseHeadline(window: FindTimeWindow) {
    if (window.blockedMembers.length === 0) {
      return 'Shared slot with no blocked roster members during the exact window.';
    }

    return `${window.availableMembers.length} free • ${window.blockedMembers.length} blocked nearby.`;
  }

  function scoreSummary(window: FindTimeWindow) {
    return `${window.scoreBreakdown.sharedMemberCount} shared • ${window.scoreBreakdown.spanSlackMinutes} slack min • ${window.scoreBreakdown.nearbyEdgePressureMinutes} edge pressure`;
  }

  function describeNearbyConstraint(constraint: FindTimeNearbyConstraint) {
    const distance = constraint.overlapsBoundary
      ? constraint.relation === 'leading'
        ? 'touches the start edge'
        : 'touches the end edge'
      : `${constraint.distanceMinutes} min ${constraint.relation === 'leading' ? 'before' : 'after'} the slot`;

    return `${constraint.memberName} · ${constraint.shiftTitle} · ${formatUtcClock(constraint.startAt)}–${formatUtcClock(constraint.endAt)} UTC · ${distance}`;
  }

  function summarizeBlockedMember(blockedMember: FindTimeBlockedMember) {
    const snippets = [
      ...blockedMember.nearbyConstraints.leading.map((constraint) => summarizeConstraintEdge(constraint)),
      ...blockedMember.nearbyConstraints.trailing.map((constraint) => summarizeConstraintEdge(constraint))
    ];

    if (snippets.length === 0) {
      return `${blockedMember.displayName} is unavailable, but no nearby trusted shift detail was available for the adjacent edges.`;
    }

    return `${blockedMember.displayName}: ${snippets.join(' · ')}`;
  }

  function summarizeConstraintEdge(constraint: FindTimeNearbyConstraint) {
    if (constraint.overlapsBoundary) {
      return `${constraint.shiftTitle} holds the ${constraint.relation === 'leading' ? 'start' : 'end'} edge`;
    }

    return `${constraint.shiftTitle} ${constraint.distanceMinutes} min ${constraint.relation === 'leading' ? 'before' : 'after'}`;
  }

  function shortConstraintSummary(constraints: FindTimeNearbyConstraint[], emptyLabel: string) {
    if (constraints.length === 0) {
      return emptyLabel;
    }

    return constraints.map((constraint) => `${constraint.shiftTitle} (${constraint.memberName})`).join(' · ');
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
            Review ranked top picks before the lighter browse list. Every explanation below is shaped by the protected server contract for the next 30 days only.
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
              Top picks stay high-density, while browse cards remain lighter-weight for scanning the rest of the truthful inventory.
            </p>
          </article>

          <article class="status-card tone-neutral">
            <span class="status-card__label">Roster names</span>
            <strong>{search.roster.map((member) => member.displayName).join(' · ')}</strong>
            <p>Only names already authorized for this calendar scope appear in these recommendation surfaces.</p>
          </article>
        </section>

        {#if search.truncated}
          <section class="feature-banner tone-warning" data-testid="find-time-truncated-state">
            <span>Result list trimmed</span>
            <p>
              The browse list stayed compact after {search.windows.length} rendered cards even though {search.totalWindows} windows matched.
            </p>
          </section>
        {/if}

        <section
          class="find-time-results-shell"
          data-testid="find-time-results"
          data-window-count={search.totalWindows}
          data-top-pick-count={search.topPicks.length}
          data-browse-count={search.browseWindows.length}
        >
          <section class="find-time-top-picks framed-panel" data-testid="find-time-top-picks" data-top-pick-count={search.topPicks.length}>
            <div class="find-time-section-heading">
              <div>
                <p class="panel-kicker">Top picks</p>
                <h3>Ranked before truncation.</h3>
                <p class="panel-copy">
                  These cards keep the richer explanation layer: who is free, who is blocked, and what nearby busy edges explain the adjacent exclusions.
                </p>
              </div>
              <span class="pill pill-active">{search.topPicks.length} surfaced</span>
            </div>

            {#if search.topPicks.length === 0}
              <article class="find-time-empty-panel" data-testid="find-time-top-picks-empty">
                <strong>No shortlist candidate qualified.</strong>
                <p>The browse inventory below stays truthful, but no shared window met the shortlist threshold for this query.</p>
              </article>
            {:else}
              <div class="find-time-top-pick-grid">
                {#each search.topPicks as window, index}
                  {@const createHref = buildSuggestionCreateHref(window)}
                  {@const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt)}
                  <article
                    class="framed-panel find-time-card find-time-card--top-pick"
                    data-testid={`find-time-top-pick-${index}`}
                    data-top-pick-rank={window.topPickRank ?? ''}
                    data-start-at={window.startAt}
                    data-end-at={window.endAt}
                    data-span-start-at={window.spanStartAt}
                    data-span-end-at={window.spanEndAt}
                    data-available-members={serializeNames(availableMemberNames(window))}
                    data-blocked-members={serializeNames(blockedMemberNames(window))}
                    data-blocked-member-count={window.blockedMembers.length}
                    data-leading-constraints={serializeNearbyConstraints(window.nearbyConstraints.leading)}
                    data-trailing-constraints={serializeNearbyConstraints(window.nearbyConstraints.trailing)}
                    data-leading-constraint-count={window.nearbyConstraints.leading.length}
                    data-trailing-constraint-count={window.nearbyConstraints.trailing.length}
                    data-score-shared-members={window.scoreBreakdown.sharedMemberCount}
                    data-score-slack-minutes={window.scoreBreakdown.spanSlackMinutes}
                    data-score-edge-pressure={window.scoreBreakdown.nearbyEdgePressureMinutes}
                  >
                    <div class="find-time-card__header find-time-card__header--stacked">
                      <div>
                        <div class="find-time-card__eyebrow-row">
                          <p class="panel-kicker">Top pick {window.topPickRank ?? index + 1}</p>
                          <span class="pill pill-active">{scoreSummary(window)}</span>
                        </div>
                        <h4>{formatUtcSlot(window)}</h4>
                        <p class="find-time-card__summary">{topPickHeadline(window)}</p>
                      </div>
                      <div class="find-time-card__pill-row">
                        <span class="pill pill-active">{window.availableMembers.length} free</span>
                        <span class={`pill ${window.blockedMembers.length === 0 ? 'pill-neutral' : 'pill-expired'}`}>
                          {window.blockedMembers.length} blocked nearby
                        </span>
                      </div>
                    </div>

                    <div class="find-time-card__meta find-time-card__meta--triple">
                      <div>
                        <span>Exact slot</span>
                        <strong>{formatUtcRange(window.startAt, window.endAt)}</strong>
                      </div>
                      <div>
                        <span>Continuous span</span>
                        <strong>{formatUtcRange(window.spanStartAt, window.spanEndAt)}</strong>
                      </div>
                      <div>
                        <span>Span slack</span>
                        <strong>{window.scoreBreakdown.spanSlackMinutes} minutes</strong>
                      </div>
                    </div>

                    <div class="find-time-explanation-grid">
                      <section class="find-time-detail-panel" data-testid={`find-time-top-pick-${index}-free-members`}>
                        <p class="panel-kicker">Who is free</p>
                        <ul class="find-time-member-list">
                          {#each window.availableMembers as member}
                            <li>{member.displayName}</li>
                          {/each}
                        </ul>
                      </section>

                      <section
                        class="find-time-detail-panel"
                        data-testid={`find-time-top-pick-${index}-blocked-members`}
                        data-blocked-member-count={window.blockedMembers.length}
                      >
                        <p class="panel-kicker">Who is blocked</p>
                        {#if window.blockedMembers.length > 0}
                          <ul class="find-time-detail-list">
                            {#each window.blockedMembers as blockedMember}
                              <li>{summarizeBlockedMember(blockedMember)}</li>
                            {/each}
                          </ul>
                        {:else}
                          <p class="find-time-fallback-copy">All named members stay free across this exact slot.</p>
                        {/if}
                      </section>
                    </div>

                    <div class="find-time-nearby-grid">
                      <section
                        class="find-time-detail-panel"
                        data-testid={`find-time-top-pick-${index}-nearby-leading`}
                        data-constraint-count={window.nearbyConstraints.leading.length}
                      >
                        <p class="panel-kicker">Why earlier times fail</p>
                        {#if window.nearbyConstraints.leading.length > 0}
                          <ul class="find-time-detail-list">
                            {#each window.nearbyConstraints.leading as constraint}
                              <li>{describeNearbyConstraint(constraint)}</li>
                            {/each}
                          </ul>
                        {:else}
                          <p class="find-time-fallback-copy">No trusted busy interval pushes into the start edge for this shortlist slot.</p>
                        {/if}
                      </section>

                      <section
                        class="find-time-detail-panel"
                        data-testid={`find-time-top-pick-${index}-nearby-trailing`}
                        data-constraint-count={window.nearbyConstraints.trailing.length}
                      >
                        <p class="panel-kicker">Why nearby later times fail</p>
                        {#if window.nearbyConstraints.trailing.length > 0}
                          <ul class="find-time-detail-list">
                            {#each window.nearbyConstraints.trailing as constraint}
                              <li>{describeNearbyConstraint(constraint)}</li>
                            {/each}
                          </ul>
                        {:else}
                          <p class="find-time-fallback-copy">No trusted busy interval pushes into the trailing edge for this shortlist slot.</p>
                        {/if}
                      </section>
                    </div>

                    <div class="find-time-card__actions">
                      {#if createHref && handoffWeekStart}
                        <a
                          class="button button-primary"
                          data-testid={`find-time-top-pick-${index}-cta`}
                          data-handoff-source="find-time"
                          data-handoff-week-start={handoffWeekStart}
                          data-handoff-start-at={window.startAt}
                          data-handoff-end-at={window.endAt}
                          href={createHref}
                        >
                          Create from this slot
                        </a>
                      {:else}
                        <p class="find-time-card__handoff-unavailable" data-testid={`find-time-top-pick-${index}-cta-unavailable`}>
                          Create handoff is unavailable until this card has a valid exact slot window.
                        </p>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </section>

          <section class="find-time-browse framed-panel" data-testid="find-time-browse-results" data-browse-count={search.browseWindows.length}>
            <div class="find-time-section-heading">
              <div>
                <p class="panel-kicker">Browse all ranked windows</p>
                <h3>Lighter follow-on inventory.</h3>
                <p class="panel-copy">
                  Browse cards stay truthful but compact so the shortlist can carry the heavier explanation load.
                </p>
              </div>
              <span class="pill pill-neutral">{search.browseWindows.length} remaining</span>
            </div>

            {#if search.browseWindows.length === 0}
              <article class="find-time-empty-panel" data-testid="find-time-browse-empty">
                <strong>No remaining browse windows.</strong>
                <p>Every truthful result for this query is already captured in the shortlist above.</p>
              </article>
            {:else}
              <div class="find-time-browse-grid">
                {#each search.browseWindows as window, index}
                  {@const createHref = buildSuggestionCreateHref(window)}
                  {@const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt)}
                  <article
                    class="framed-panel find-time-card find-time-card--browse"
                    data-testid={`find-time-browse-window-${index}`}
                    data-start-at={window.startAt}
                    data-end-at={window.endAt}
                    data-span-start-at={window.spanStartAt}
                    data-span-end-at={window.spanEndAt}
                    data-available-members={serializeNames(availableMemberNames(window))}
                    data-blocked-members={serializeNames(blockedMemberNames(window))}
                    data-blocked-member-count={window.blockedMembers.length}
                    data-leading-constraints={serializeNearbyConstraints(window.nearbyConstraints.leading)}
                    data-trailing-constraints={serializeNearbyConstraints(window.nearbyConstraints.trailing)}
                    data-nearby-constraint-count={nearbyConstraintCount(window)}
                  >
                    <div class="find-time-card__header">
                      <div>
                        <p class="panel-kicker">Browse {index + 1}</p>
                        <h4>{formatUtcSlot(window)}</h4>
                      </div>
                      <span class={`pill ${window.blockedMembers.length === 0 ? 'pill-neutral' : 'pill-expired'}`}>
                        {window.availableMembers.length} free / {window.blockedMembers.length} blocked
                      </span>
                    </div>

                    <p class="find-time-card__summary find-time-card__summary--compact">{browseHeadline(window)}</p>

                    <div class="find-time-card__meta">
                      <div>
                        <span>Exact slot</span>
                        <strong>{formatUtcRange(window.startAt, window.endAt)}</strong>
                      </div>
                      <div>
                        <span>Span</span>
                        <strong>{window.spanDurationMinutes} minutes</strong>
                      </div>
                    </div>

                    <div class="find-time-compact-grid">
                      <section class="find-time-detail-panel" data-testid={`find-time-browse-window-${index}-free-members`}>
                        <p class="panel-kicker">Free</p>
                        <p>{availableMemberNames(window).join(' · ')}</p>
                      </section>

                      <section class="find-time-detail-panel" data-testid={`find-time-browse-window-${index}-nearby-summary`}>
                        <p class="panel-kicker">Nearby edges</p>
                        <p>
                          Before: {shortConstraintSummary(window.nearbyConstraints.leading, 'No leading constraint summary.')}
                        </p>
                        <p>
                          After: {shortConstraintSummary(window.nearbyConstraints.trailing, 'No trailing constraint summary.')}
                        </p>
                      </section>
                    </div>

                    <div class="find-time-card__actions">
                      {#if createHref && handoffWeekStart}
                        <a
                          class="button button-secondary"
                          data-testid={`find-time-browse-window-${index}-cta`}
                          data-handoff-source="find-time"
                          data-handoff-week-start={handoffWeekStart}
                          data-handoff-start-at={window.startAt}
                          data-handoff-end-at={window.endAt}
                          href={createHref}
                        >
                          Create from this slot
                        </a>
                      {:else}
                        <p class="find-time-card__handoff-unavailable" data-testid={`find-time-browse-window-${index}-cta-unavailable`}>
                          Create handoff is unavailable until this card has a valid exact slot window.
                        </p>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </section>
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
  .find-time-results-shell,
  .find-time-top-picks,
  .find-time-browse,
  .find-time-top-pick-grid,
  .find-time-browse-grid,
  .find-time-card,
  .find-time-card__header,
  .find-time-card__meta,
  .find-time-card__actions,
  .find-time-form,
  .find-time-form__grid,
  .find-time-presets,
  .find-time-explanation-grid,
  .find-time-nearby-grid,
  .find-time-compact-grid,
  .find-time-member-list,
  .find-time-detail-list,
  .find-time-section-heading {
    display: grid;
    gap: 1rem;
  }

  .find-time-hero {
    background:
      radial-gradient(circle at top right, rgba(244, 162, 89, 0.18), transparent 32%),
      linear-gradient(180deg, rgba(12, 22, 35, 0.95), rgba(7, 16, 26, 0.9));
  }

  .find-time-hero__meta,
  .find-time-presets,
  .find-time-card__pill-row,
  .find-time-card__eyebrow-row {
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
  .find-time-compact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .find-time-results-shell {
    gap: 1.25rem;
  }

  .find-time-top-picks,
  .find-time-browse {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(7, 16, 26, 0.72);
  }

  .find-time-top-pick-grid {
    grid-template-columns: 1fr;
  }

  .find-time-browse-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .find-time-card {
    align-content: start;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(7, 16, 26, 0.75);
  }

  .find-time-card--top-pick {
    border-color: rgba(244, 162, 89, 0.42);
    box-shadow: 0 20px 44px rgba(0, 0, 0, 0.28);
    background:
      radial-gradient(circle at top right, rgba(244, 162, 89, 0.12), transparent 35%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
      rgba(7, 16, 26, 0.88);
  }

  .find-time-card--browse {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.024), rgba(255, 255, 255, 0.01)),
      rgba(7, 16, 26, 0.68);
  }

  .find-time-card__header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .find-time-card__header--stacked {
    gap: 1.25rem;
  }

  .find-time-card__summary {
    margin: 0;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.6;
  }

  .find-time-card__summary--compact {
    font-size: 0.96rem;
  }

  .find-time-card__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .find-time-card__meta--triple {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .find-time-card__meta > div,
  .find-time-detail-panel,
  .find-time-empty-panel {
    padding: 1rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
  }

  .find-time-card__actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .find-time-card__actions .button {
    width: fit-content;
  }

  .find-time-card__handoff-unavailable {
    margin: 0;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    border: 1px dashed rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.02);
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

  .find-time-explanation-grid,
  .find-time-nearby-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .find-time-member-list,
  .find-time-detail-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .find-time-member-list {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .find-time-member-list li,
  .find-time-detail-list li {
    padding: 0.8rem 0.95rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    line-height: 1.5;
  }

  .find-time-member-list li {
    border-color: rgba(143, 211, 193, 0.24);
    background: rgba(143, 211, 193, 0.08);
  }

  .find-time-fallback-copy,
  .find-time-empty-panel p,
  .find-time-detail-panel p:last-child {
    margin: 0;
  }

  .find-time-empty-panel strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  @media (max-width: 980px) {
    .find-time-toolbar,
    .find-time-form__grid,
    .find-time-summary-grid,
    .find-time-card__meta,
    .find-time-card__meta--triple,
    .find-time-card__header,
    .find-time-explanation-grid,
    .find-time-nearby-grid,
    .find-time-compact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
