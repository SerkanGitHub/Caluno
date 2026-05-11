import { h as head, a as attr_class, e as ensure_array_like, d as derived } from "../../../../../../chunks/renderer.js";
import { d as deriveCreatePrefillWeekStart, b as buildCreatePrefillHref } from "../../../../../../chunks/create-prefill.js";
import { e as escape_html, a as attr } from "../../../../../../chunks/attributes.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const durationPresets = [30, 60, 90, 120];
    let { data } = $$props;
    const shellState = derived(() => data.protectedShellState);
    const appShell = derived(() => data.appShell ?? null);
    const browserState = derived(() => data.findTimeBrowserState);
    const findTimeView = derived(() => data.findTimeView);
    const calendarView = derived(() => findTimeView().kind === "calendar" ? findTimeView() : null);
    const deniedView = derived(() => findTimeView().kind === "denied" ? findTimeView() : null);
    const search = derived(() => calendarView()?.search ?? null);
    const viewerName = derived(() => appShell()?.viewer.displayName ?? "Protected member");
    const relatedCalendars = derived(() => calendarView()?.group?.calendars ?? appShell()?.calendars ?? []);
    const selectedDuration = derived(() => search()?.durationMinutes ? String(search().durationMinutes) : "60");
    const selectedStart = derived(() => search()?.range.requestedStart ?? search()?.range.startAt.slice(0, 10) ?? "");
    const routeState = derived(() => {
      if (browserState().status === "offline-unavailable") {
        return {
          status: "offline-unavailable",
          label: "Offline unavailable",
          tone: "tone-danger",
          reason: browserState().reason,
          message: browserState().message
        };
      }
      if (deniedView()) {
        return {
          status: "denied",
          label: "Access denied",
          tone: "tone-danger",
          reason: deniedView().reason,
          message: deniedView().detail.detail
        };
      }
      if (!search()) {
        return {
          status: "trusted-online",
          label: "Trusted route",
          tone: "tone-neutral",
          reason: null,
          message: browserState().message
        };
      }
      return {
        status: search().status,
        label: describeSearchStatus(search().status),
        tone: toneForSearchStatus(search().status),
        reason: search().reason,
        message: search().message
      };
    });
    function describeSearchStatus(status) {
      switch (status) {
        case "ready":
          return "Truthful results";
        case "no-results":
          return "No results";
        case "invalid-input":
          return "Invalid input";
        case "query-failure":
          return "Query failed";
        case "timeout":
          return "Query timeout";
        case "malformed-response":
          return "Malformed response";
        default:
          return status;
      }
    }
    function toneForSearchStatus(status) {
      switch (status) {
        case "ready":
          return "tone-neutral";
        case "no-results":
        case "timeout":
          return "tone-warning";
        default:
          return "tone-danger";
      }
    }
    function buildPresetHref(calendarId, durationMinutes, start) {
      const searchParams = new URLSearchParams({ duration: String(durationMinutes) });
      if (start) {
        searchParams.set("start", start);
      }
      return `/calendars/${calendarId}/find-time?${searchParams.toString()}`;
    }
    function buildSuggestionCreateHref(window) {
      if (!calendarView()) {
        return null;
      }
      return buildCreatePrefillHref({ calendarId: calendarView().calendar.id, window });
    }
    function formatUtcSlot(window) {
      return `${formatUtcDay(window.startAt)} · ${formatUtcClock(window.startAt)}–${formatUtcClock(window.endAt)} UTC`;
    }
    function formatUtcRange(startAt, endAt) {
      return `${formatUtcDay(startAt)} ${formatUtcClock(startAt)} → ${formatUtcDay(endAt)} ${formatUtcClock(endAt)} UTC`;
    }
    function formatUtcDay(value) {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
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
    function availableMemberNames(window) {
      return window.availableMembers.map((member) => member.displayName);
    }
    function blockedMemberNames(window) {
      return window.blockedMembers.map((member) => member.displayName);
    }
    function nearbyConstraintCount(window) {
      return window.nearbyConstraints.leading.length + window.nearbyConstraints.trailing.length;
    }
    function topPickHeadline(window) {
      if (window.blockedMembers.length === 0) {
        return `All ${window.availableMembers.length} named members stay free across this slot and the nearby edges remain unconstrained.`;
      }
      return `${window.availableMembers.length} named members align while ${window.blockedMembers.length} blocked member${window.blockedMembers.length === 1 ? "" : "s"} explain the nearby exclusions.`;
    }
    function browseHeadline(window) {
      if (window.blockedMembers.length === 0) {
        return "Shared slot with no blocked roster members during the exact window.";
      }
      return `${window.availableMembers.length} free • ${window.blockedMembers.length} blocked nearby.`;
    }
    function scoreSummary(window) {
      return `${window.scoreBreakdown.sharedMemberCount} shared • ${window.scoreBreakdown.spanSlackMinutes} slack min • ${window.scoreBreakdown.nearbyEdgePressureMinutes} edge pressure`;
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
    head("1xn3u53", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(calendarView() ? `${calendarView().calendar.name} • Find time • Caluno` : "Find time • Caluno")}</title>`);
      });
    });
    $$renderer2.push(`<main class="workspace-shell find-time-layout svelte-1xn3u53"><aside class="workspace-rail framed-panel"><p class="eyebrow">Truthful availability search</p> <h1>${escape_html(viewerName())}</h1> <p class="rail-copy">`);
    if (browserState().status === "offline-unavailable") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`This route stays server-backed, so offline navigation fails closed instead of replaying a cached calendar view.`);
    } else if (calendarView()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`Search windows come from the trusted roster and member-attributed busy intervals already authorized for this calendar.`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`The route rejected this calendar before any roster or availability data could be exposed.`);
    }
    $$renderer2.push(`<!--]--></p> <div class="status-stack"><article${attr_class(
      `status-card ${shellState().mode === "offline-denied" ? "tone-danger" : shellState().mode === "cached-offline" ? "tone-warning" : "tone-neutral"}`,
      "svelte-1xn3u53"
    )} data-testid="find-time-shell-state"><span class="status-card__label svelte-1xn3u53">Protected shell</span> <strong class="svelte-1xn3u53">${escape_html(shellState().mode)}</strong> <p class="svelte-1xn3u53">${escape_html(shellState().detail)}</p> `);
    if (shellState().reason) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code>${escape_html(shellState().reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> <article${attr_class(`status-card ${routeState().tone}`, "svelte-1xn3u53")} data-testid="find-time-route-state"${attr("data-status", routeState().status)}><span class="status-card__label svelte-1xn3u53">Find-time route</span> <strong class="svelte-1xn3u53">${escape_html(routeState().label)}</strong> <p class="svelte-1xn3u53">${escape_html(routeState().message)}</p> `);
    if (routeState().reason) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code>${escape_html(routeState().reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> `);
    if (search() && browserState().status !== "offline-unavailable") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${toneForSearchStatus(search().status)}`, "svelte-1xn3u53")} data-testid="find-time-search-state"${attr("data-status", search().status)}><span class="status-card__label svelte-1xn3u53">Search diagnostics</span> <strong class="svelte-1xn3u53">${escape_html(search().status)}</strong> <p class="svelte-1xn3u53">${escape_html(search().message)}</p> <code>${escape_html(search().reason ?? "none")}</code></article> <article class="status-card tone-neutral" data-testid="find-time-scope-state"><span class="status-card__label">Trusted scope</span> <strong>${escape_html(search().range.startAt.slice(0, 10))} → ${escape_html(search().range.endAt.slice(0, 10))}</strong> <p>${escape_html(search().durationMinutes ?? 0)} minute search over ${escape_html(search().roster.length)} named member${escape_html(search().roster.length === 1 ? "" : "s")}.</p> <code>${escape_html(search().totalWindows)} windows</code></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <nav class="rail-links">`);
    if (calendarView()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a${attr("href", `/calendars/${calendarView().calendar.id}`)}>Back to calendar board</a>`);
    } else if (appShell()?.primaryCalendar) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<a${attr("href", `/calendars/${appShell().primaryCalendar.id}`)}>Open a permitted calendar</a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <a href="/groups">Open groups</a> <a href="/logout">Sign out</a></nav></aside> <section class="workspace-main">`);
    if (browserState().status === "offline-unavailable") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="denied-banner framed-panel" data-testid="find-time-offline-state"><p class="eyebrow">Offline unavailable</p> <h2>Find-time stays server-only when this browser goes offline.</h2> <p class="lede">${escape_html(browserState().message)}</p> <div class="denied-meta"><div><span>Route state</span> <strong>offline-unavailable</strong></div> <div><span>Reason code</span> <strong>${escape_html(browserState().reason ?? "none")}</strong></div> <div><span>Policy</span> <strong>fail-closed</strong></div></div> <div class="denied-actions">`);
      if (appShell()?.primaryCalendar) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="button button-primary"${attr("href", `/calendars/${appShell().primaryCalendar.id}`)}>Return to a trusted calendar</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <a class="button button-secondary" href="/groups">Open groups</a></div></section>`);
    } else if (deniedView()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<section class="denied-banner framed-panel" data-testid="find-time-denied-state"><p class="eyebrow">${escape_html(deniedView().detail.badge)}</p> <h2>${escape_html(deniedView().detail.title)}</h2> <p class="lede">${escape_html(deniedView().detail.detail)}</p> <div class="denied-meta"><div><span>Failure phase</span> <strong>${escape_html(deniedView().failurePhase)}</strong></div> <div><span>Reason code</span> <strong>${escape_html(deniedView().reason)}</strong></div> <div><span>Attempted id</span> <code>${escape_html(deniedView().attemptedCalendarId)}</code></div></div> <div class="denied-actions"><a class="button button-primary" href="/groups">Return to permitted groups</a> `);
      if (appShell()?.primaryCalendar) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="button button-secondary"${attr("href", `/calendars/${appShell().primaryCalendar.id}`)}>Open a permitted calendar</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></section>`);
    } else if (calendarView() && search()) {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`<header class="hero-panel compact find-time-hero svelte-1xn3u53" data-testid="find-time-shell"><div class="find-time-hero__copy"><p class="eyebrow">${escape_html(calendarView().group?.name ?? "Permitted calendar")}</p> <h2>${escape_html(calendarView().calendar.name)}</h2> <p class="lede">Review ranked top picks before the lighter browse list. Every explanation below is shaped by the protected server contract for the next 30 days only.</p></div> <div class="find-time-hero__meta svelte-1xn3u53"><span class="pill pill-active">${escape_html(calendarView().calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span> <span class="pill pill-neutral">${escape_html(calendarView().group?.role ?? "member")} access</span> <span${attr_class(
        `pill ${routeState().tone === "tone-danger" ? "pill-danger" : routeState().tone === "tone-warning" ? "pill-expired" : "pill-neutral"}`,
        "svelte-1xn3u53"
      )}>${escape_html(routeState().status)}</span> <span class="pill pill-neutral">${escape_html(search().roster.length)} named members</span></div></header> <section class="find-time-toolbar framed-panel svelte-1xn3u53"><div class="find-time-toolbar__copy"><p class="panel-kicker">Search the protected 30-day horizon</p> <h3>Move the window, keep the scope.</h3> <p class="panel-copy">Duration and start anchor stay explicit. Invalid values, empty results, and query failures never collapse into the same UI state.</p></div> <form method="GET" class="stacked-form find-time-form svelte-1xn3u53" data-testid="find-time-query-form"><div class="find-time-form__grid svelte-1xn3u53"><label class="field"><span>Duration (minutes)</span> <input class="input" data-testid="find-time-duration-input" type="number" min="15" max="720" step="15" name="duration"${attr("value", selectedDuration())} required=""/></label> <label class="field"><span>Search from (UTC day)</span> <input class="input" data-testid="find-time-start-input" type="date" name="start"${attr("value", selectedStart())}/></label></div> <div class="find-time-presets svelte-1xn3u53" aria-label="Duration presets"><!--[-->`);
      const each_array = ensure_array_like(durationPresets);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let preset = each_array[$$index];
        $$renderer2.push(`<a${attr_class(`pill ${selectedDuration() === String(preset) ? "pill-active" : "pill-neutral"}`, "svelte-1xn3u53")}${attr("href", buildPresetHref(calendarView().calendar.id, preset, selectedStart()))}>${escape_html(preset)} min</a>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="hero-actions"><button class="button button-primary" data-testid="find-time-submit" type="submit">Refresh truthful windows</button> <a class="button button-secondary"${attr("href", `/calendars/${calendarView().calendar.id}`)}>Back to board</a></div></form></section> `);
      if (search().status === "ready") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<section class="find-time-summary-grid svelte-1xn3u53"><article class="status-card tone-neutral" data-testid="find-time-summary"><span class="status-card__label">Window inventory</span> <strong>${escape_html(search().totalWindows)} truthful window${escape_html(search().totalWindows === 1 ? "" : "s")}</strong> <p>Top picks stay high-density, while browse cards remain lighter-weight for scanning the rest of the truthful inventory.</p></article> <article class="status-card tone-neutral"><span class="status-card__label">Roster names</span> <strong>${escape_html(search().roster.map((member) => member.displayName).join(" · "))}</strong> <p>Only names already authorized for this calendar scope appear in these recommendation surfaces.</p></article></section> `);
        if (search().truncated) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<section class="feature-banner tone-warning" data-testid="find-time-truncated-state"><span>Result list trimmed</span> <p>The browse list stayed compact after ${escape_html(search().windows.length)} rendered cards even though ${escape_html(search().totalWindows)} windows matched.</p></section>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <section class="find-time-results-shell svelte-1xn3u53" data-testid="find-time-results"${attr("data-window-count", search().totalWindows)}${attr("data-top-pick-count", search().topPicks.length)}${attr("data-browse-count", search().browseWindows.length)}><section class="find-time-top-picks framed-panel svelte-1xn3u53" data-testid="find-time-top-picks"${attr("data-top-pick-count", search().topPicks.length)}><div class="find-time-section-heading svelte-1xn3u53"><div><p class="panel-kicker">Top picks</p> <h3>Ranked before truncation.</h3> <p class="panel-copy">These cards keep the richer explanation layer: who is free, who is blocked, and what nearby busy edges explain the adjacent exclusions.</p></div> <span class="pill pill-active">${escape_html(search().topPicks.length)} surfaced</span></div> `);
        if (search().topPicks.length === 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<article class="find-time-empty-panel svelte-1xn3u53" data-testid="find-time-top-picks-empty"><strong class="svelte-1xn3u53">No shortlist candidate qualified.</strong> <p class="svelte-1xn3u53">The browse inventory below stays truthful, but no shared window met the shortlist threshold for this query.</p></article>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="find-time-top-pick-grid svelte-1xn3u53"><!--[-->`);
          const each_array_1 = ensure_array_like(search().topPicks);
          for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
            let window = each_array_1[index];
            const createHref = buildSuggestionCreateHref(window);
            const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt);
            $$renderer2.push(`<article class="framed-panel find-time-card find-time-card--top-pick svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}`)}${attr("data-top-pick-rank", window.topPickRank ?? "")}${attr("data-start-at", window.startAt)}${attr("data-end-at", window.endAt)}${attr("data-span-start-at", window.spanStartAt)}${attr("data-span-end-at", window.spanEndAt)}${attr("data-available-members", serializeNames(availableMemberNames(window)))}${attr("data-blocked-members", serializeNames(blockedMemberNames(window)))}${attr("data-blocked-member-count", window.blockedMembers.length)}${attr("data-leading-constraints", serializeNearbyConstraints(window.nearbyConstraints.leading))}${attr("data-trailing-constraints", serializeNearbyConstraints(window.nearbyConstraints.trailing))}${attr("data-leading-constraint-count", window.nearbyConstraints.leading.length)}${attr("data-trailing-constraint-count", window.nearbyConstraints.trailing.length)}${attr("data-score-shared-members", window.scoreBreakdown.sharedMemberCount)}${attr("data-score-slack-minutes", window.scoreBreakdown.spanSlackMinutes)}${attr("data-score-edge-pressure", window.scoreBreakdown.nearbyEdgePressureMinutes)}><div class="find-time-card__header find-time-card__header--stacked svelte-1xn3u53"><div><div class="find-time-card__eyebrow-row svelte-1xn3u53"><p class="panel-kicker">Top pick ${escape_html(window.topPickRank ?? index + 1)}</p> <span class="pill pill-active">${escape_html(scoreSummary(window))}</span></div> <h4>${escape_html(formatUtcSlot(window))}</h4> <p class="find-time-card__summary svelte-1xn3u53">${escape_html(topPickHeadline(window))}</p></div> <div class="find-time-card__pill-row svelte-1xn3u53"><span class="pill pill-active">${escape_html(window.availableMembers.length)} free</span> <span${attr_class(`pill ${window.blockedMembers.length === 0 ? "pill-neutral" : "pill-expired"}`, "svelte-1xn3u53")}>${escape_html(window.blockedMembers.length)} blocked nearby</span></div></div> <div class="find-time-card__meta find-time-card__meta--triple svelte-1xn3u53"><div class="svelte-1xn3u53"><span class="svelte-1xn3u53">Exact slot</span> <strong class="svelte-1xn3u53">${escape_html(formatUtcRange(window.startAt, window.endAt))}</strong></div> <div class="svelte-1xn3u53"><span class="svelte-1xn3u53">Continuous span</span> <strong class="svelte-1xn3u53">${escape_html(formatUtcRange(window.spanStartAt, window.spanEndAt))}</strong></div> <div class="svelte-1xn3u53"><span class="svelte-1xn3u53">Span slack</span> <strong class="svelte-1xn3u53">${escape_html(window.scoreBreakdown.spanSlackMinutes)} minutes</strong></div></div> <div class="find-time-explanation-grid svelte-1xn3u53"><section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-free-members`)}><p class="panel-kicker svelte-1xn3u53">Who is free</p> <ul class="find-time-member-list svelte-1xn3u53"><!--[-->`);
            const each_array_2 = ensure_array_like(window.availableMembers);
            for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
              let member = each_array_2[$$index_1];
              $$renderer2.push(`<li class="svelte-1xn3u53">${escape_html(member.displayName)}</li>`);
            }
            $$renderer2.push(`<!--]--></ul></section> <section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-blocked-members`)}${attr("data-blocked-member-count", window.blockedMembers.length)}><p class="panel-kicker svelte-1xn3u53">Who is blocked</p> `);
            if (window.blockedMembers.length > 0) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<ul class="find-time-detail-list svelte-1xn3u53"><!--[-->`);
              const each_array_3 = ensure_array_like(window.blockedMembers);
              for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                let blockedMember = each_array_3[$$index_2];
                $$renderer2.push(`<li class="svelte-1xn3u53">${escape_html(summarizeBlockedMember(blockedMember))}</li>`);
              }
              $$renderer2.push(`<!--]--></ul>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="find-time-fallback-copy svelte-1xn3u53">All named members stay free across this exact slot.</p>`);
            }
            $$renderer2.push(`<!--]--></section></div> <div class="find-time-nearby-grid svelte-1xn3u53"><section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-nearby-leading`)}${attr("data-constraint-count", window.nearbyConstraints.leading.length)}><p class="panel-kicker svelte-1xn3u53">Why earlier times fail</p> `);
            if (window.nearbyConstraints.leading.length > 0) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<ul class="find-time-detail-list svelte-1xn3u53"><!--[-->`);
              const each_array_4 = ensure_array_like(window.nearbyConstraints.leading);
              for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
                let constraint = each_array_4[$$index_3];
                $$renderer2.push(`<li class="svelte-1xn3u53">${escape_html(describeNearbyConstraint(constraint))}</li>`);
              }
              $$renderer2.push(`<!--]--></ul>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="find-time-fallback-copy svelte-1xn3u53">No trusted busy interval pushes into the start edge for this shortlist slot.</p>`);
            }
            $$renderer2.push(`<!--]--></section> <section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-nearby-trailing`)}${attr("data-constraint-count", window.nearbyConstraints.trailing.length)}><p class="panel-kicker svelte-1xn3u53">Why nearby later times fail</p> `);
            if (window.nearbyConstraints.trailing.length > 0) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<ul class="find-time-detail-list svelte-1xn3u53"><!--[-->`);
              const each_array_5 = ensure_array_like(window.nearbyConstraints.trailing);
              for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
                let constraint = each_array_5[$$index_4];
                $$renderer2.push(`<li class="svelte-1xn3u53">${escape_html(describeNearbyConstraint(constraint))}</li>`);
              }
              $$renderer2.push(`<!--]--></ul>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="find-time-fallback-copy svelte-1xn3u53">No trusted busy interval pushes into the trailing edge for this shortlist slot.</p>`);
            }
            $$renderer2.push(`<!--]--></section></div> <div class="find-time-card__actions svelte-1xn3u53">`);
            if (createHref && handoffWeekStart) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<a class="button button-primary svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-cta`)} data-handoff-source="find-time"${attr("data-handoff-week-start", handoffWeekStart)}${attr("data-handoff-start-at", window.startAt)}${attr("data-handoff-end-at", window.endAt)}${attr("href", createHref)}>Create from this slot</a>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="find-time-card__handoff-unavailable svelte-1xn3u53"${attr("data-testid", `find-time-top-pick-${index}-cta-unavailable`)}>Create handoff is unavailable until this card has a valid exact slot window.</p>`);
            }
            $$renderer2.push(`<!--]--></div></article>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></section> <section class="find-time-browse framed-panel svelte-1xn3u53" data-testid="find-time-browse-results"${attr("data-browse-count", search().browseWindows.length)}><div class="find-time-section-heading svelte-1xn3u53"><div><p class="panel-kicker">Browse all ranked windows</p> <h3>Lighter follow-on inventory.</h3> <p class="panel-copy">Browse cards stay truthful but compact so the shortlist can carry the heavier explanation load.</p></div> <span class="pill pill-neutral">${escape_html(search().browseWindows.length)} remaining</span></div> `);
        if (search().browseWindows.length === 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<article class="find-time-empty-panel svelte-1xn3u53" data-testid="find-time-browse-empty"><strong class="svelte-1xn3u53">No remaining browse windows.</strong> <p class="svelte-1xn3u53">Every truthful result for this query is already captured in the shortlist above.</p></article>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="find-time-browse-grid svelte-1xn3u53"><!--[-->`);
          const each_array_6 = ensure_array_like(search().browseWindows);
          for (let index = 0, $$length = each_array_6.length; index < $$length; index++) {
            let window = each_array_6[index];
            const createHref = buildSuggestionCreateHref(window);
            const handoffWeekStart = deriveCreatePrefillWeekStart(window.startAt);
            $$renderer2.push(`<article class="framed-panel find-time-card find-time-card--browse svelte-1xn3u53"${attr("data-testid", `find-time-browse-window-${index}`)}${attr("data-start-at", window.startAt)}${attr("data-end-at", window.endAt)}${attr("data-span-start-at", window.spanStartAt)}${attr("data-span-end-at", window.spanEndAt)}${attr("data-available-members", serializeNames(availableMemberNames(window)))}${attr("data-blocked-members", serializeNames(blockedMemberNames(window)))}${attr("data-blocked-member-count", window.blockedMembers.length)}${attr("data-leading-constraints", serializeNearbyConstraints(window.nearbyConstraints.leading))}${attr("data-trailing-constraints", serializeNearbyConstraints(window.nearbyConstraints.trailing))}${attr("data-nearby-constraint-count", nearbyConstraintCount(window))}><div class="find-time-card__header svelte-1xn3u53"><div><p class="panel-kicker">Browse ${escape_html(index + 1)}</p> <h4>${escape_html(formatUtcSlot(window))}</h4></div> <span${attr_class(`pill ${window.blockedMembers.length === 0 ? "pill-neutral" : "pill-expired"}`, "svelte-1xn3u53")}>${escape_html(window.availableMembers.length)} free / ${escape_html(window.blockedMembers.length)} blocked</span></div> <p class="find-time-card__summary find-time-card__summary--compact svelte-1xn3u53">${escape_html(browseHeadline(window))}</p> <div class="find-time-card__meta svelte-1xn3u53"><div class="svelte-1xn3u53"><span class="svelte-1xn3u53">Exact slot</span> <strong class="svelte-1xn3u53">${escape_html(formatUtcRange(window.startAt, window.endAt))}</strong></div> <div class="svelte-1xn3u53"><span class="svelte-1xn3u53">Span</span> <strong class="svelte-1xn3u53">${escape_html(window.spanDurationMinutes)} minutes</strong></div></div> <div class="find-time-compact-grid svelte-1xn3u53"><section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-browse-window-${index}-free-members`)}><p class="panel-kicker svelte-1xn3u53">Free</p> <p class="svelte-1xn3u53">${escape_html(availableMemberNames(window).join(" · "))}</p></section> <section class="find-time-detail-panel svelte-1xn3u53"${attr("data-testid", `find-time-browse-window-${index}-nearby-summary`)}><p class="panel-kicker svelte-1xn3u53">Nearby edges</p> <p class="svelte-1xn3u53">Before: ${escape_html(shortConstraintSummary(window.nearbyConstraints.leading, "No leading constraint summary."))}</p> <p class="svelte-1xn3u53">After: ${escape_html(shortConstraintSummary(window.nearbyConstraints.trailing, "No trailing constraint summary."))}</p></section></div> <div class="find-time-card__actions svelte-1xn3u53">`);
            if (createHref && handoffWeekStart) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<a class="button button-secondary svelte-1xn3u53"${attr("data-testid", `find-time-browse-window-${index}-cta`)} data-handoff-source="find-time"${attr("data-handoff-week-start", handoffWeekStart)}${attr("data-handoff-start-at", window.startAt)}${attr("data-handoff-end-at", window.endAt)}${attr("href", createHref)}>Create from this slot</a>`);
            } else {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<p class="find-time-card__handoff-unavailable svelte-1xn3u53"${attr("data-testid", `find-time-browse-window-${index}-cta-unavailable`)}>Create handoff is unavailable until this card has a valid exact slot window.</p>`);
            }
            $$renderer2.push(`<!--]--></div></article>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></section></section>`);
      } else if (search().status === "no-results") {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<section class="feature-banner tone-warning" data-testid="find-time-empty-state"><span>No truthful windows</span> <p>${escape_html(search().message)}</p></section>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<section${attr_class(`feature-banner ${toneForSearchStatus(search().status)}`, "svelte-1xn3u53")} data-testid="find-time-error-state"${attr("data-status", search().status)}><span class="svelte-1xn3u53">${escape_html(describeSearchStatus(search().status))}</span> <p class="svelte-1xn3u53">${escape_html(search().message)}</p></section>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="related-panel framed-panel"><div class="group-card__header"><div><p class="panel-kicker">Visible calendar inventory</p> <h3>Jump only within the calendars your session can already prove.</h3></div> <span class="pill pill-neutral">${escape_html(relatedCalendars().length)} visible</span></div> <div class="calendar-list"><!--[-->`);
    const each_array_7 = ensure_array_like(relatedCalendars());
    for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
      let calendar = each_array_7[$$index_7];
      $$renderer2.push(`<a${attr_class(`calendar-link ${calendarView() && calendar.id === calendarView().calendar.id ? "active" : ""}`, "svelte-1xn3u53")}${attr("href", `/calendars/${calendar.id}/find-time?duration=${selectedDuration()}&start=${selectedStart()}`)}><strong class="svelte-1xn3u53">${escape_html(calendar.name)}</strong> <span class="svelte-1xn3u53">${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")} • find-time</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></section></section></main>`);
  });
}
export {
  _page as default
};
