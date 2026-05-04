import { h as head, d as derived, e as escape_html, a as attr, c as ensure_array_like, b as attr_class } from "../../../../../chunks/root.js";
import { p as page } from "../../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import { M as MobileShell } from "../../../../../chunks/MobileShell.js";
import "@capacitor/network";
import { p as primaryCalendarLandingHref } from "../../../../../chunks/load-app-shell.js";
import "@supabase/ssr";
import { d as describeDeniedCalendarReason } from "../../../../../chunks/app-shell.js";
const CREATE_PREFILL_FLAG = "1";
const CREATE_PREFILL_SOURCE = "find-time";
function buildCreatePrefillHref(params) {
  const normalizedWindow = normalizeCreatePrefillWindow(params.window);
  if (!normalizedWindow) {
    return null;
  }
  const searchParams = new URLSearchParams({
    create: CREATE_PREFILL_FLAG,
    start: deriveCreatePrefillWeekStart(normalizedWindow.startAt),
    prefillStartAt: normalizedWindow.startAt,
    prefillEndAt: normalizedWindow.endAt,
    source: params.source ?? CREATE_PREFILL_SOURCE
  });
  return `/calendars/${encodeURIComponent(params.calendarId)}?${searchParams.toString()}`;
}
function deriveCreatePrefillWeekStart(startAt) {
  const parsedStartAt = parseIsoInstant(startAt);
  if (!parsedStartAt) {
    return null;
  }
  const dayStart = new Date(
    Date.UTC(parsedStartAt.getUTCFullYear(), parsedStartAt.getUTCMonth(), parsedStartAt.getUTCDate())
  );
  const dayOfWeek = dayStart.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - daysFromMonday);
  return dayStart.toISOString().slice(0, 10);
}
function normalizeCreatePrefillWindow(window) {
  const startAt = normalizeIsoInstant(window.startAt);
  const endAt = normalizeIsoInstant(window.endAt);
  if (!startAt || !endAt) {
    return null;
  }
  const startTime = Date.parse(startAt);
  const endTime = Date.parse(endAt);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }
  return {
    startAt,
    endAt
  };
}
function normalizeIsoInstant(value) {
  if (!value) {
    return null;
  }
  const trimmedValue = value.trim();
  if (!ISO_INSTANT_PATTERN.test(trimmedValue)) {
    return null;
  }
  const parsed = parseIsoInstant(trimmedValue);
  return parsed ? parsed.toISOString() : null;
}
function parseIsoInstant(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function resolveMobileFindTimeRouteState(params) {
  if (params.routeAccess?.kind === "denied") {
    const deniedDetail = describeDeniedCalendarReason(params.routeAccess.state.reason);
    return {
      status: "denied",
      reason: params.routeAccess.state.reason,
      message: deniedDetail.detail,
      routeMode: params.routeMode,
      networkConnected: params.network?.connected ?? null,
      networkSource: params.network?.source ?? "none",
      denialPhase: params.routeAccess.state.failurePhase,
      calendarId: params.routeAccess.state.attemptedCalendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    };
  }
  const calendarId = params.routeAccess?.kind === "calendar" ? params.routeAccess.state.calendar.id : null;
  if (params.routeMode === "cached-offline") {
    return {
      status: "offline-unavailable",
      reason: "FIND_TIME_CACHED_OFFLINE",
      message: "This calendar reopened from cached continuity, but mobile find-time stays live-only instead of replaying stale answers.",
      routeMode: params.routeMode,
      networkConnected: params.network?.connected ?? null,
      networkSource: params.network?.source ?? "none",
      denialPhase: "continuity",
      calendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    };
  }
  if (params.network && !params.network.connected) {
    return {
      status: "offline-unavailable",
      reason: "FIND_TIME_OFFLINE",
      message: "The device is offline, so mobile find-time stays live-only until trusted connectivity returns.",
      routeMode: params.routeMode,
      networkConnected: false,
      networkSource: params.network.source,
      denialPhase: "connectivity",
      calendarId,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      browseCount: 0,
      totalWindows: 0,
      truncated: false,
      durationMinutes: null,
      rangeStartAt: null,
      rangeEndAt: null
    };
  }
  if (!params.search) {
    return null;
  }
  return {
    status: params.search.status,
    reason: params.search.reason,
    message: params.search.message,
    routeMode: params.routeMode,
    networkConnected: params.network?.connected ?? null,
    networkSource: params.network?.source ?? "none",
    denialPhase: null,
    calendarId: params.search.calendarId,
    topPicks: params.search.topPicks,
    browseWindows: params.search.browseWindows,
    windows: params.search.windows,
    topPickCount: params.search.topPickCount,
    browseCount: params.search.browseWindows.length,
    totalWindows: params.search.totalWindows,
    truncated: params.search.truncated,
    durationMinutes: params.search.durationMinutes,
    rangeStartAt: params.search.range.startAt,
    rangeEndAt: params.search.range.endAt
  };
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const durationPresets = [30, 60, 90, 120];
    let { data } = $$props;
    const authState = derived(() => data.authState);
    const protectedEntry = derived(() => data.protectedEntry);
    const attemptedCalendarId = derived(() => page.params.calendarId ?? "");
    const durationParam = derived(() => page.url.searchParams.get("duration"));
    const startParam = derived(() => page.url.searchParams.get("start"));
    let shellResult = null;
    let routeResult = null;
    let shellBootstrapMode = "loading";
    let networkStatus = null;
    let searchView = null;
    let searchLoading = false;
    let removeNetworkListener = null;
    const shellFailure = derived(() => null);
    const appShell = derived(() => null);
    const primaryHref = derived(() => appShell() ? primaryCalendarLandingHref(appShell()) : null);
    const routeMode = derived(() => protectedEntry().routeMode);
    const snapshotOrigin = derived(() => protectedEntry().snapshotOrigin);
    const continuityReason = derived(() => protectedEntry().continuityReason);
    const lastTrustedRefreshAt = derived(() => protectedEntry().lastTrustedRefreshAt);
    const trustedCalendars = derived(() => appShell()?.calendars ?? []);
    const activeCalendar = derived(() => null);
    const routeState = derived(() => resolveMobileFindTimeRouteState({
      routeAccess: routeResult,
      routeMode: routeMode(),
      network: networkStatus,
      search: searchView
    }));
    const selectedDuration = derived(() => durationParam() ?? "");
    const selectedStart = derived(() => startParam() ?? "");
    const viewerName = derived(() => appShell()?.viewer.displayName ?? authState().displayName ?? "Caluno member");
    const title = derived(() => activeCalendar() ? `${activeCalendar().name} · Find time` : "Find time");
    const networkLabel = derived(() => {
      if (routeState()?.networkConnected === true) {
        return "online";
      }
      if (routeState()?.networkConnected === false) {
        return "offline";
      }
      return "unknown";
    });
    async function destroyNetworkSubscription() {
      const remove = removeNetworkListener;
      removeNetworkListener = null;
      if (remove) {
        await remove();
      }
    }
    function buildPresetHref(calendarId, durationMinutes, start) {
      const searchParams = new URLSearchParams({ duration: String(durationMinutes) });
      if (start) {
        searchParams.set("start", start);
      }
      return `/calendars/${calendarId}/find-time?${searchParams.toString()}`;
    }
    function buildSuggestionCreateHref(startAt, endAt) {
      if (!activeCalendar()) {
        return null;
      }
      return buildCreatePrefillHref({ calendarId: activeCalendar().id, window: { startAt, endAt } });
    }
    function formatUtcSlot(startAt, endAt) {
      return `${formatUtcDay(startAt)} · ${formatUtcClock(startAt)}–${formatUtcClock(endAt)} UTC`;
    }
    function formatUtcDay(value) {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        timeZone: "UTC"
      }).format(new Date(value));
    }
    function formatUtcClock(value) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC"
      }).format(new Date(value));
    }
    function serializeNames(values) {
      return values.join("|");
    }
    function serializeNearbyConstraints(constraints) {
      return constraints.map((constraint) => `${constraint.memberName}:${constraint.shiftTitle}:${constraint.distanceMinutes}`).join("|");
    }
    function availableNames(window) {
      return window.availableMembers.map((member) => member.displayName);
    }
    function blockedNames(window) {
      return window.blockedMembers.map((member) => member.displayName);
    }
    function nearbyConstraintCount(window) {
      return window.nearbyConstraints.leading.length + window.nearbyConstraints.trailing.length;
    }
    function topPickHeadline(window) {
      if (window.blockedMembers.length === 0) {
        return `All ${window.availableMembers.length} named members stay free across this exact slot.`;
      }
      return `${window.availableMembers.length} named members align while ${window.blockedMembers.length} blocked member${window.blockedMembers.length === 1 ? "" : "s"} explain the nearby exclusions.`;
    }
    function browseHeadline(window) {
      if (window.blockedMembers.length === 0) {
        return "Shared slot with no blocked roster members during the exact window.";
      }
      return `${window.availableMembers.length} free • ${window.blockedMembers.length} blocked nearby.`;
    }
    function describeNearbyConstraint(constraint) {
      const distance = constraint.overlapsBoundary ? constraint.relation === "leading" ? "touches the start edge" : "touches the end edge" : `${constraint.distanceMinutes} min ${constraint.relation === "leading" ? "before" : "after"} the slot`;
      return `${constraint.memberName} · ${constraint.shiftTitle} · ${formatUtcClock(constraint.startAt)}–${formatUtcClock(constraint.endAt)} UTC · ${distance}`;
    }
    function summarizeBlockedMember(blockedMember) {
      const snippets = [
        ...blockedMember.nearbyConstraints.leading.map((constraint) => summarizeConstraintEdge(constraint)),
        ...blockedMember.nearbyConstraints.trailing.map((constraint) => summarizeConstraintEdge(constraint))
      ];
      if (snippets.length === 0) {
        return `${blockedMember.displayName} is unavailable, but no nearby trusted shift detail was available for the adjacent edges.`;
      }
      return `${blockedMember.displayName}: ${snippets.join(" · ")}`;
    }
    function summarizeConstraintEdge(constraint) {
      if (constraint.overlapsBoundary) {
        return `${constraint.shiftTitle} holds the ${constraint.relation === "leading" ? "start" : "end"} edge`;
      }
      return `${constraint.shiftTitle} ${constraint.distanceMinutes} min ${constraint.relation === "leading" ? "before" : "after"}`;
    }
    function shortConstraintSummary(constraints, emptyLabel) {
      if (constraints.length === 0) {
        return emptyLabel;
      }
      return constraints.map((constraint) => `${constraint.shiftTitle} (${constraint.memberName})`).join(" · ");
    }
    onDestroy(() => {
      void destroyNetworkSubscription();
    });
    head("6psife", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(title())} • Caluno Mobile</title>`);
      });
    });
    MobileShell($$renderer2, {
      viewerName: viewerName(),
      title: title(),
      subtitle: "Phone-first find-time stays live-backed when trusted connectivity is available and fails closed when scope or network truth is not trustworthy.",
      activeTab: "calendar",
      shellBootstrapMode,
      routeMode: routeMode(),
      snapshotOrigin: snapshotOrigin(),
      continuityReason: continuityReason(),
      lastTrustedRefreshAt: lastTrustedRefreshAt(),
      onboardingState: appShell()?.onboardingState ?? null,
      failurePhase: shellResult?.failurePhase,
      failureDetail: shellResult?.detail,
      primaryHref: primaryHref(),
      primaryLabel: appShell()?.primaryCalendar?.name ?? null,
      shellTestId: "find-time-shell",
      children: ($$renderer3) => {
        $$renderer3.push(`<section class="find-time-route svelte-6psife" data-testid="find-time-route-state"${attr("data-status", routeState()?.status ?? "loading")}${attr("data-reason", routeState()?.reason ?? "none")}${attr("data-route-mode", routeMode())}${attr("data-network", networkLabel())}${attr("data-network-source", routeState()?.networkSource ?? networkStatus?.source ?? "none")}${attr("data-top-pick-count", routeState()?.topPickCount ?? 0)}${attr("data-browse-count", routeState()?.browseCount ?? 0)}${attr("data-denial-phase", routeState()?.denialPhase ?? "none")}${attr("data-calendar-id", routeState()?.calendarId ?? attemptedCalendarId())}>`);
        if (routeMode() === "trusted-online" && !networkStatus || searchLoading) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-neutral svelte-6psife" data-testid="find-time-loading-state"><p class="panel-kicker svelte-6psife">Find-time route</p> <h2 class="svelte-6psife">Resolving trusted mobile availability.</h2> <p class="panel-copy svelte-6psife">The route is confirming shell scope, network truth, and the live roster-plus-busy contract before any compact result cards open.</p></article>`);
        } else if (routeState()?.status === "offline-unavailable") {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-6psife" data-testid="find-time-offline-state"><p class="panel-kicker svelte-6psife">Offline unavailable</p> <h2 class="svelte-6psife">Find-time stays live-only on mobile.</h2> <p class="panel-copy svelte-6psife">${escape_html(routeState().message)}</p> <div class="facts-grid svelte-6psife"><div class="svelte-6psife"><dt class="svelte-6psife">Reason</dt> <dd class="svelte-6psife">${escape_html(routeState().reason ?? "none")}</dd></div> <div class="svelte-6psife"><dt class="svelte-6psife">Route mode</dt> <dd class="svelte-6psife">${escape_html(routeMode())}</dd></div> <div class="svelte-6psife"><dt class="svelte-6psife">Network source</dt> <dd class="svelte-6psife">${escape_html(routeState().networkSource)}</dd></div></div></article>`);
        } else if (routeState()?.status === "denied") {
          $$renderer3.push("<!--[2-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-6psife" data-testid="find-time-denied-state"><p class="panel-kicker svelte-6psife">Access denied</p> <h2 class="svelte-6psife">Protected find-time scope stayed closed.</h2> <p class="panel-copy svelte-6psife">${escape_html(routeState().message)}</p> <div class="facts-grid svelte-6psife"><div class="svelte-6psife"><dt class="svelte-6psife">Reason</dt> <dd class="svelte-6psife">${escape_html(routeState().reason ?? "none")}</dd></div> <div class="svelte-6psife"><dt class="svelte-6psife">Failure phase</dt> <dd class="svelte-6psife">${escape_html(routeState().denialPhase ?? "none")}</dd></div> <div class="svelte-6psife"><dt class="svelte-6psife">Attempted id</dt> <dd class="svelte-6psife"><code class="svelte-6psife">${escape_html(attemptedCalendarId())}</code></dd></div></div></article>`);
        } else if (shellFailure()) {
          $$renderer3.push("<!--[3-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-6psife" data-testid="find-time-shell-failure"><p class="panel-kicker svelte-6psife">Shell load failed</p> <h2 class="svelte-6psife">Trusted route setup stayed closed.</h2> <p class="panel-copy svelte-6psife">${escape_html(shellFailure().detail)}</p> <div class="facts-grid svelte-6psife"><div class="svelte-6psife"><dt class="svelte-6psife">Reason</dt> <dd class="svelte-6psife">${escape_html(shellFailure().reasonCode)}</dd></div> <div class="svelte-6psife"><dt class="svelte-6psife">Failure phase</dt> <dd class="svelte-6psife">${escape_html(shellFailure().failurePhase)}</dd></div></div> <button class="button button-primary svelte-6psife" type="button"${attr("disabled", !shellFailure().retryable, true)}>Retry trusted load</button></article>`);
        } else if (activeCalendar()) {
          $$renderer3.push("<!--[4-->");
          $$renderer3.push(`<div class="find-time-content svelte-6psife"><header class="hero-card framed-panel tone-neutral svelte-6psife" data-testid="find-time-hero"><div><p class="panel-kicker svelte-6psife">Live mobile find-time</p> <h2 class="svelte-6psife">${escape_html(activeCalendar().name)}</h2> <p class="panel-copy svelte-6psife">Search a trusted 30-day horizon, keep Top picks distinct from browse windows, and expose stable route diagnostics for denied, timeout, malformed, and offline states.</p></div> <div class="hero-meta svelte-6psife"><span class="pill svelte-6psife">${escape_html(routeMode())}</span> <span class="pill svelte-6psife">${escape_html("none")}</span> <span class="pill svelte-6psife">${escape_html(routeState()?.status ?? "idle")}</span> <span class="pill svelte-6psife">${escape_html(routeState()?.topPickCount ?? 0)} top picks</span></div></header> <section class="toolbar-card framed-panel svelte-6psife"><div><p class="panel-kicker svelte-6psife">Search the trusted horizon</p> <h3 class="svelte-6psife">Duration and anchor stay explicit.</h3> <p class="panel-copy svelte-6psife">Invalid inputs, no-results, query failures, and malformed responses stay attributable through deterministic status codes instead of a generic empty state.</p></div> <form method="GET" class="query-form svelte-6psife" data-testid="find-time-query-form"><label class="field svelte-6psife"><span class="svelte-6psife">Duration (minutes)</span> <input class="input svelte-6psife" data-testid="find-time-duration-input" type="number" min="15" max="720" step="15" name="duration"${attr("value", selectedDuration())} placeholder="60"/></label> <label class="field svelte-6psife"><span class="svelte-6psife">Search from (UTC day)</span> <input class="input svelte-6psife" data-testid="find-time-start-input" type="date" name="start"${attr("value", selectedStart())}/></label> <div class="preset-row svelte-6psife" aria-label="Duration presets"><!--[-->`);
          const each_array = ensure_array_like(durationPresets);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let preset = each_array[$$index];
            $$renderer3.push(`<a${attr_class(`pill preset-pill ${selectedDuration() === String(preset) ? "preset-pill--active" : ""}`, "svelte-6psife")}${attr("href", buildPresetHref(activeCalendar().id, preset, selectedStart()))}>${escape_html(preset)} min</a>`);
          }
          $$renderer3.push(`<!--]--></div> <button class="button button-primary svelte-6psife" data-testid="find-time-submit" type="submit">Refresh truthful windows</button></form></section> `);
          if (routeState()?.status === "ready") {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<section class="summary-grid svelte-6psife"><article class="status-card framed-panel tone-neutral svelte-6psife" data-testid="find-time-search-state"${attr("data-status", routeState().status)}><span class="status-card__label svelte-6psife">Route status</span> <strong class="svelte-6psife">${escape_html(routeState().status)}</strong> <p class="svelte-6psife">${escape_html(routeState().message)}</p></article> <article class="status-card framed-panel tone-neutral svelte-6psife" data-testid="find-time-summary"><span class="status-card__label svelte-6psife">Search range</span> <strong class="svelte-6psife">${escape_html(routeState().totalWindows)} truthful window${escape_html(routeState().totalWindows === 1 ? "" : "s")}</strong> <p class="svelte-6psife">${escape_html(routeState().durationMinutes ?? 0)} minute duration over ${escape_html(0)} named members ·
                ${escape_html(routeState().rangeStartAt?.slice(0, 10))} → ${escape_html(routeState().rangeEndAt?.slice(0, 10))}.</p></article></section> <section class="result-shell svelte-6psife" data-testid="find-time-results"${attr("data-window-count", routeState().totalWindows)}${attr("data-top-pick-count", routeState().topPickCount)}${attr("data-browse-count", routeState().browseCount)}><section class="result-panel framed-panel svelte-6psife" data-testid="find-time-top-picks"${attr("data-top-pick-count", routeState().topPickCount)}><div class="section-heading svelte-6psife"><div><p class="panel-kicker svelte-6psife">Top picks</p> <h3 class="svelte-6psife">Highest-confidence shared windows.</h3> <p class="panel-copy svelte-6psife">Shortlist cards carry the heavier explanation load before the lighter browse inventory.</p></div> <span class="pill svelte-6psife">${escape_html(routeState().topPickCount)}</span></div> `);
            if (routeState().topPicks.length === 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<article class="empty-panel svelte-6psife" data-testid="find-time-top-picks-empty"><strong class="svelte-6psife">No shortlist candidate qualified.</strong> <p class="svelte-6psife">The route still stayed ready, but every truthful result belongs in the browse inventory only.</p></article>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<div class="card-list svelte-6psife"><!--[-->`);
              const each_array_1 = ensure_array_like(routeState().topPicks);
              for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
                let window = each_array_1[index];
                const createHref = buildSuggestionCreateHref(window.startAt, window.endAt);
                const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt);
                $$renderer3.push(`<article class="result-card result-card--top framed-panel svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}`)}${attr("data-start-at", window.startAt)}${attr("data-end-at", window.endAt)}${attr("data-span-start-at", window.spanStartAt)}${attr("data-span-end-at", window.spanEndAt)}${attr("data-top-pick-rank", window.topPickRank ?? index + 1)}${attr("data-available-members", serializeNames(availableNames(window)))}${attr("data-blocked-members", serializeNames(blockedNames(window)))}${attr("data-blocked-member-count", window.blockedMembers.length)}${attr("data-leading-constraints", serializeNearbyConstraints(window.nearbyConstraints.leading))}${attr("data-trailing-constraints", serializeNearbyConstraints(window.nearbyConstraints.trailing))}${attr("data-nearby-constraint-count", nearbyConstraintCount(window))}${attr("data-handoff-ready", createHref && handoffWeekStart ? "true" : "false")}><div class="card-header svelte-6psife"><div><p class="panel-kicker svelte-6psife">Top pick ${escape_html(window.topPickRank ?? index + 1)}</p> <h4 class="svelte-6psife">${escape_html(formatUtcSlot(window.startAt, window.endAt))}</h4></div> <span class="pill svelte-6psife">${escape_html(window.availableMembers.length)} free / ${escape_html(window.blockedMembers.length)} blocked</span></div> <p class="panel-copy svelte-6psife">${escape_html(topPickHeadline(window))}</p> <div class="find-time-compact-grid svelte-6psife"><section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-free-members`)}><p class="panel-kicker svelte-6psife">Who is free</p> <p class="svelte-6psife">${escape_html(availableNames(window).join(" · ") || "No one stayed free for this exact slot.")}</p></section> <section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-blocked-members`)}${attr("data-blocked-member-count", window.blockedMembers.length)}><p class="panel-kicker svelte-6psife">Who is blocked</p> `);
                if (window.blockedMembers.length > 0) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<ul class="detail-list svelte-6psife"><!--[-->`);
                  const each_array_2 = ensure_array_like(window.blockedMembers);
                  for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
                    let blockedMember = each_array_2[$$index_1];
                    $$renderer3.push(`<li>${escape_html(summarizeBlockedMember(blockedMember))}</li>`);
                  }
                  $$renderer3.push(`<!--]--></ul>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<p class="find-time-fallback-copy svelte-6psife">All named members stay free across this exact slot.</p>`);
                }
                $$renderer3.push(`<!--]--></section></div> <div class="find-time-compact-grid svelte-6psife"><section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-nearby-leading`)}${attr("data-constraint-count", window.nearbyConstraints.leading.length)}><p class="panel-kicker svelte-6psife">Why earlier times fail</p> `);
                if (window.nearbyConstraints.leading.length > 0) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<ul class="detail-list svelte-6psife"><!--[-->`);
                  const each_array_3 = ensure_array_like(window.nearbyConstraints.leading);
                  for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                    let constraint = each_array_3[$$index_2];
                    $$renderer3.push(`<li>${escape_html(describeNearbyConstraint(constraint))}</li>`);
                  }
                  $$renderer3.push(`<!--]--></ul>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<p class="find-time-fallback-copy svelte-6psife">No trusted busy interval pushes into the start edge for this shortlist slot.</p>`);
                }
                $$renderer3.push(`<!--]--></section> <section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-nearby-trailing`)}${attr("data-constraint-count", window.nearbyConstraints.trailing.length)}><p class="panel-kicker svelte-6psife">Why nearby later times fail</p> `);
                if (window.nearbyConstraints.trailing.length > 0) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<ul class="detail-list svelte-6psife"><!--[-->`);
                  const each_array_4 = ensure_array_like(window.nearbyConstraints.trailing);
                  for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
                    let constraint = each_array_4[$$index_3];
                    $$renderer3.push(`<li>${escape_html(describeNearbyConstraint(constraint))}</li>`);
                  }
                  $$renderer3.push(`<!--]--></ul>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<p class="find-time-fallback-copy svelte-6psife">No trusted busy interval pushes into the trailing edge for this shortlist slot.</p>`);
                }
                $$renderer3.push(`<!--]--></section></div> <div class="card-actions svelte-6psife">`);
                if (createHref && handoffWeekStart) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<a class="button button-primary svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-cta`)} data-handoff-source="find-time"${attr("data-handoff-week-start", handoffWeekStart)}${attr("data-handoff-start-at", window.startAt)}${attr("data-handoff-end-at", window.endAt)}${attr("href", createHref)}>Create from this slot</a>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<p class="find-time-handoff-unavailable svelte-6psife"${attr("data-testid", `find-time-top-pick-${index}-cta-unavailable`)}>Create handoff is unavailable until this card has a valid exact slot window.</p>`);
                }
                $$renderer3.push(`<!--]--></div></article>`);
              }
              $$renderer3.push(`<!--]--></div>`);
            }
            $$renderer3.push(`<!--]--></section> <section class="result-panel framed-panel svelte-6psife" data-testid="find-time-browse-results"${attr("data-browse-count", routeState().browseCount)}><div class="section-heading svelte-6psife"><div><p class="panel-kicker svelte-6psife">Browse windows</p> <h3 class="svelte-6psife">Compact follow-on inventory.</h3> <p class="panel-copy svelte-6psife">Browse cards stay truthful but lighter so scanning stays phone-first.</p></div> <span class="pill svelte-6psife">${escape_html(routeState().browseCount)}</span></div> `);
            if (routeState().browseWindows.length === 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<article class="empty-panel svelte-6psife" data-testid="find-time-browse-empty"><strong class="svelte-6psife">No remaining browse windows.</strong> <p class="svelte-6psife">Every truthful result is already represented in the Top picks section.</p></article>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<div class="card-list svelte-6psife"><!--[-->`);
              const each_array_5 = ensure_array_like(routeState().browseWindows);
              for (let index = 0, $$length = each_array_5.length; index < $$length; index++) {
                let window = each_array_5[index];
                const createHref = buildSuggestionCreateHref(window.startAt, window.endAt);
                const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt);
                $$renderer3.push(`<article class="result-card framed-panel svelte-6psife"${attr("data-testid", `find-time-browse-window-${index}`)}${attr("data-start-at", window.startAt)}${attr("data-end-at", window.endAt)}${attr("data-span-start-at", window.spanStartAt)}${attr("data-span-end-at", window.spanEndAt)}${attr("data-available-members", serializeNames(availableNames(window)))}${attr("data-blocked-members", serializeNames(blockedNames(window)))}${attr("data-blocked-member-count", window.blockedMembers.length)}${attr("data-leading-constraints", serializeNearbyConstraints(window.nearbyConstraints.leading))}${attr("data-trailing-constraints", serializeNearbyConstraints(window.nearbyConstraints.trailing))}${attr("data-nearby-constraint-count", nearbyConstraintCount(window))}${attr("data-handoff-ready", createHref && handoffWeekStart ? "true" : "false")}><div class="card-header svelte-6psife"><div><p class="panel-kicker svelte-6psife">Browse ${escape_html(index + 1)}</p> <h4 class="svelte-6psife">${escape_html(formatUtcSlot(window.startAt, window.endAt))}</h4></div> <span class="pill svelte-6psife">${escape_html(window.availableMembers.length)} free / ${escape_html(window.blockedMembers.length)} blocked</span></div> <p class="panel-copy svelte-6psife">${escape_html(browseHeadline(window))}</p> <div class="find-time-compact-grid svelte-6psife"><section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-browse-window-${index}-free-members`)}><p class="panel-kicker svelte-6psife">Free</p> <p class="svelte-6psife">${escape_html(availableNames(window).join(" · "))}</p></section> <section class="detail-panel svelte-6psife"${attr("data-testid", `find-time-browse-window-${index}-nearby-summary`)}><p class="panel-kicker svelte-6psife">Nearby edges</p> <p class="svelte-6psife">Before: ${escape_html(shortConstraintSummary(window.nearbyConstraints.leading, "No leading constraint summary."))}</p> <p class="svelte-6psife">After: ${escape_html(shortConstraintSummary(window.nearbyConstraints.trailing, "No trailing constraint summary."))}</p></section></div> <div class="card-actions svelte-6psife">`);
                if (createHref && handoffWeekStart) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<a class="button button-secondary svelte-6psife"${attr("data-testid", `find-time-browse-window-${index}-cta`)} data-handoff-source="find-time"${attr("data-handoff-week-start", handoffWeekStart)}${attr("data-handoff-start-at", window.startAt)}${attr("data-handoff-end-at", window.endAt)}${attr("href", createHref)}>Create from this slot</a>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<p class="find-time-handoff-unavailable svelte-6psife"${attr("data-testid", `find-time-browse-window-${index}-cta-unavailable`)}>Create handoff is unavailable until this card has a valid exact slot window.</p>`);
                }
                $$renderer3.push(`<!--]--></div></article>`);
              }
              $$renderer3.push(`<!--]--></div>`);
            }
            $$renderer3.push(`<!--]--></section></section>`);
          } else if (routeState()) {
            $$renderer3.push("<!--[1-->");
            $$renderer3.push(`<article${attr_class(`status-card framed-panel ${routeState().status === "no-results" || routeState().status === "timeout" ? "tone-warning" : "tone-danger"}`, "svelte-6psife")}${attr("data-testid", routeState().status === "no-results" ? "find-time-empty-state" : "find-time-error-state")}><span class="status-card__label svelte-6psife">Find-time status</span> <strong data-testid="find-time-search-state"${attr("data-status", routeState().status)} class="svelte-6psife">${escape_html(routeState().status)}</strong> <p class="svelte-6psife">${escape_html(routeState().message)}</p> `);
            if (routeState().reason) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<code class="svelte-6psife">${escape_html(routeState().reason)}</code>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></article>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></section> `);
        if (trustedCalendars().length) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<section class="inventory-card framed-panel svelte-6psife"><div class="section-heading svelte-6psife"><div><p class="panel-kicker svelte-6psife">Trusted inventory</p> <h3 class="svelte-6psife">Jump only within already-permitted calendars.</h3></div> <span class="pill svelte-6psife">${escape_html(trustedCalendars().length)}</span></div> <div class="calendar-list svelte-6psife"><!--[-->`);
          const each_array_6 = ensure_array_like(trustedCalendars());
          for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
            let calendar = each_array_6[$$index_6];
            $$renderer3.push(`<a${attr_class(`calendar-link ${activeCalendar()?.id === calendar.id ? "active" : ""}`, "svelte-6psife")}${attr("href", buildPresetHref(calendar.id, Number.parseInt(selectedDuration() || "60", 10) || 60, selectedStart()))}><strong class="svelte-6psife">${escape_html(calendar.name)}</strong> <span class="svelte-6psife">${escape_html(calendar.isDefault ? "Primary calendar" : "Secondary calendar")} · find-time</span></a>`);
          }
          $$renderer3.push(`<!--]--></div></section>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
  });
}
export {
  _page as default
};
