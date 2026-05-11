import { h as head, d as derived, e as escape_html, a as attr, c as ensure_array_like, b as attr_class, s as store_get, u as unsubscribe_stores } from "../../../../chunks/root.js";
import { p as page } from "../../../../chunks/index2.js";
import { o as onDestroy } from "../../../../chunks/index-server.js";
import { d as describeDeniedCalendarReason } from "../../../../chunks/app-shell.js";
import { M as MobileShell } from "../../../../chunks/MobileShell.js";
import * as rrulePkg from "rrule";
/* empty css                                                                          */
import "../../../../chunks/repository.js";
import "@capacitor/network";
import "@capacitor/app";
import { p as primaryCalendarLandingHref } from "../../../../chunks/load-app-shell.js";
import "@supabase/ssr";
import { c as clearTrustedNotificationCalendarScope, n as notificationRouteDiagnostics } from "../../../../chunks/router.js";
import "@capacitor/preferences";
import "@capacitor/local-notifications";
import "@capacitor/core";
import "@capacitor/push-notifications";
function resolveVisibleWeek(searchParams, now = /* @__PURE__ */ new Date()) {
  const requestedStart = searchParams.get("start")?.trim() || null;
  if (requestedStart) {
    const parsedRequested = parseIsoDay(requestedStart);
    if (parsedRequested) {
      return buildVisibleWeek(parsedRequested, "query", requestedStart, null);
    }
    return buildVisibleWeek(startOfUtcWeek(now), "fallback-invalid", requestedStart, "VISIBLE_WEEK_START_INVALID");
  }
  return buildVisibleWeek(startOfUtcWeek(now), "default", null, null);
}
function buildVisibleWeek(startDate, source, requestedStart, reason) {
  const weekStart = startOfUtcDay(startDate);
  const weekEnd = addUtcDays(weekStart, 7);
  return {
    start: weekStart.toISOString().slice(0, 10),
    endExclusive: weekEnd.toISOString().slice(0, 10),
    startAt: weekStart.toISOString(),
    endAt: weekEnd.toISOString(),
    requestedStart,
    source,
    reason,
    dayKeys: Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index).toISOString().slice(0, 10))
  };
}
function parseIsoDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function startOfUtcWeek(value) {
  const dayStart = startOfUtcDay(value);
  const dayOfWeek = dayStart.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addUtcDays(dayStart, -daysFromMonday);
}
function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function addUtcDays(value, amount) {
  return new Date(value.getTime() + amount * DAY_IN_MS);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
const rruleModule$1 = rrulePkg;
const RRule$1 = rruleModule$1.RRule ?? rruleModule$1.default?.RRule;
({
  daily: RRule$1.DAILY,
  weekly: RRule$1.WEEKLY,
  monthly: RRule$1.MONTHLY
});
const rruleModule = rrulePkg;
const RRule = rruleModule.RRule ?? rruleModule.default?.RRule;
({
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY
});
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    function createRecurrenceSuggestionDiagnostic(params) {
      return {
        scopeKey: params.scopeKey,
        status: params.status,
        reason: params.reason,
        message: params.message
      };
    }
    const authState = derived(() => page.data.authState);
    const protectedEntry = derived(() => page.data.protectedEntry);
    const attemptedCalendarId = derived(() => page.params.calendarId ?? "");
    const visibleWeek = derived(() => resolveVisibleWeek(page.url.searchParams, /* @__PURE__ */ new Date()));
    const routeDiagnostics = derived(() => store_get($$store_subs ??= {}, "$notificationRouteDiagnostics", notificationRouteDiagnostics));
    let shellResult = null;
    let shellBootstrapMode = "loading";
    let createPrefillArrival = {
      status: "none",
      cleanedSearchParams: new URLSearchParams()
    };
    let recurrenceSuggestionStatus = createRecurrenceSuggestionDiagnostic({
      scopeKey: "uninitialized",
      status: "inactive",
      reason: "RECURRENCE_SUGGESTION_INACTIVE",
      message: "Trusted online recurrence suggestions are inactive until a permitted calendar week is active."
    });
    let runtimeState = null;
    let runtime = null;
    let runtimeSubscription = null;
    let notificationRuntime = null;
    let notificationSubscription = null;
    const shellFailure = derived(() => null);
    const appShell = derived(() => null);
    const primaryHref = derived(() => appShell() ? primaryCalendarLandingHref(appShell()) : null);
    const activeCalendar = derived(() => null);
    const deniedState = derived(() => null);
    const deniedDetail = derived(() => deniedState() ? describeDeniedCalendarReason(deniedState().reason) : null);
    const routeMode = derived(() => protectedEntry().routeMode);
    const snapshotOrigin = derived(() => protectedEntry().snapshotOrigin);
    const continuityReason = derived(() => protectedEntry().continuityReason);
    const lastTrustedRefreshAt = derived(() => protectedEntry().lastTrustedRefreshAt);
    const trustedCalendars = derived(() => appShell()?.calendars ?? []);
    async function destroyRuntime() {
      runtimeSubscription?.();
      runtimeSubscription = null;
      const activeRuntime = runtime;
      runtime = null;
      runtimeState = null;
      if (activeRuntime) {
        await activeRuntime.destroy();
      }
    }
    async function destroyNotificationRuntime() {
      notificationSubscription?.();
      notificationSubscription = null;
      const activeRuntime = notificationRuntime;
      notificationRuntime = null;
      if (activeRuntime) {
        await activeRuntime.destroy();
      }
    }
    onDestroy(() => {
      clearTrustedNotificationCalendarScope();
      void destroyRuntime();
      void destroyNotificationRuntime();
    });
    head("7ipbkm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(activeCalendar() ? `${activeCalendar().name} • Caluno Mobile` : "Calendar access • Caluno Mobile")}</title>`);
      });
    });
    MobileShell($$renderer2, {
      viewerName: appShell()?.viewer.displayName ?? authState().displayName ?? "Caluno member",
      title: activeCalendar() ? activeCalendar().name : "Calendar access resolved from trusted scope.",
      subtitle: "Previously synced calendars can reopen here offline, keep mobile-local edits visible, and surface exactly when reconnect is pending or retryable.",
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
      shellTestId: "calendar-shell",
      children: ($$renderer3) => {
        $$renderer3.push(`<section class="calendar-route svelte-7ipbkm" data-testid="calendar-route-state"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-route-mode", runtimeState?.routeMode ?? routeMode())}${attr("data-shell-snapshot-origin", snapshotOrigin())}${attr("data-snapshot-origin", runtimeState?.snapshotOrigin ?? "none")}${attr("data-visible-week-source", visibleWeek().source)}${attr("data-visible-week-start", visibleWeek().start)}${attr("data-board-source", runtimeState?.boardSource ?? "none")}${attr("data-queue-state", runtimeState?.queueState ?? "idle")}${attr("data-pending-count", runtimeState?.pendingQueueLength ?? 0)}${attr("data-retryable-count", runtimeState?.retryableQueueLength ?? 0)}${attr("data-sync-phase", runtimeState?.syncPhase ?? "idle")}${attr("data-last-retryable-reason", runtimeState?.lastRetryableFailure?.reason ?? "none")}${attr("data-denied-reason", deniedState()?.reason ?? protectedEntry().denialReasonCode ?? "none")}${attr("data-failure-phase", deniedState()?.failurePhase ?? shellFailure()?.failurePhase ?? (protectedEntry().routeMode === "denied" ? "continuity" : "none"))}${attr("data-attempted-calendar-id", attemptedCalendarId())}${attr("data-create-prefill-status", createPrefillArrival.status)}${attr("data-create-prefill-source", "none")}${attr("data-create-prefill-start", "none")}${attr("data-create-prefill-end", "none")}${attr("data-recurrence-suggestion-scope", recurrenceSuggestionStatus.scopeKey)}${attr("data-recurrence-suggestion-status", recurrenceSuggestionStatus.status)}${attr("data-recurrence-suggestion-reason", recurrenceSuggestionStatus.reason ?? "none")}${attr("data-recurrence-suggestion-match-count", 0)}${attr("data-recurrence-suggestion-exemplar-shift-id", "none")}${attr("data-notification-route-result", routeDiagnostics().code)}${attr("data-notification-route-reason", routeDiagnostics().reason ?? "none")}>`);
        if (shellFailure()) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-7ipbkm" data-testid="mobile-shell-load-failure"><p class="panel-kicker svelte-7ipbkm">Shell load failed</p> <h2 class="svelte-7ipbkm">Protected content stayed hidden.</h2> <p class="panel-copy svelte-7ipbkm">${escape_html(shellFailure().detail)}</p> <div class="meta-strip svelte-7ipbkm"><code class="svelte-7ipbkm">${escape_html(shellFailure().reasonCode)}</code> <code class="svelte-7ipbkm">${escape_html(shellFailure().failurePhase)}</code></div> <button class="button button-primary svelte-7ipbkm" type="button"${attr("disabled", !shellFailure().retryable, true)}>Retry trusted load</button></article>`);
        } else if (protectedEntry().routeMode === "denied") {
          $$renderer3.push("<!--[4-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-7ipbkm" data-testid="mobile-continuity-denied"><p class="panel-kicker svelte-7ipbkm">Continuity denied</p> <h2 class="svelte-7ipbkm">Protected content stayed closed.</h2> <p class="panel-copy svelte-7ipbkm">${escape_html(protectedEntry().continuityDetail ?? "Cached continuity was unavailable or rejected, so the route failed closed.")}</p> <div class="facts-grid denied-grid svelte-7ipbkm"><div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Reason</dt> <dd class="svelte-7ipbkm">${escape_html(protectedEntry().denialReasonCode ?? "AUTH_REQUIRED")}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Route mode</dt> <dd class="svelte-7ipbkm">${escape_html(routeMode())}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Attempted id</dt> <dd class="svelte-7ipbkm"><code class="svelte-7ipbkm">${escape_html(attemptedCalendarId())}</code></dd></div></div> <div class="hero-actions svelte-7ipbkm"><a class="button button-primary svelte-7ipbkm"${attr("href", protectedEntry().signInHref ?? "/signin")}>Sign in again</a> <a class="button button-secondary svelte-7ipbkm" href="/groups">Return to groups</a></div></article>`);
        } else if (deniedState() && deniedDetail()) {
          $$renderer3.push("<!--[5-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-7ipbkm" data-testid="access-denied-state"><p class="panel-kicker svelte-7ipbkm">${escape_html(deniedDetail().badge)}</p> <h2 class="svelte-7ipbkm">${escape_html(deniedDetail().title)}</h2> <p class="panel-copy svelte-7ipbkm">${escape_html(deniedDetail().detail)}</p> <div class="facts-grid denied-grid svelte-7ipbkm"><div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Reason</dt> <dd class="svelte-7ipbkm">${escape_html(deniedState().reason)}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Failure phase</dt> <dd class="svelte-7ipbkm">${escape_html(deniedState().failurePhase)}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Attempted id</dt> <dd class="svelte-7ipbkm"><code class="svelte-7ipbkm">${escape_html(deniedState().attemptedCalendarId)}</code></dd></div></div> <div class="hero-actions svelte-7ipbkm"><a class="button button-primary svelte-7ipbkm" href="/groups">Return to groups</a> `);
          if (primaryHref()) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<a class="button button-secondary svelte-7ipbkm"${attr("href", primaryHref())}>Open a permitted calendar</a>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div></article>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></section> `);
        if (trustedCalendars().length) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<section class="inventory-card framed-panel svelte-7ipbkm"><div class="inventory-header svelte-7ipbkm"><div><p class="panel-kicker svelte-7ipbkm">Trusted inventory</p> <h3 class="svelte-7ipbkm">Jump only within already-permitted calendars.</h3></div> <span class="pill svelte-7ipbkm">${escape_html(trustedCalendars().length)} visible</span></div> <div class="calendar-list svelte-7ipbkm"><!--[-->`);
          const each_array = ensure_array_like(trustedCalendars());
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let calendar = each_array[$$index];
            $$renderer3.push(`<a${attr_class(`calendar-link ${activeCalendar()?.id === calendar.id ? "active" : ""}`, "svelte-7ipbkm")}${attr("href", `/calendars/${calendar.id}?start=${visibleWeek().start}`)}><strong>${escape_html(calendar.name)}</strong> <span class="svelte-7ipbkm">${escape_html(calendar.isDefault ? "Primary calendar" : "Secondary calendar")}</span></a>`);
          }
          $$renderer3.push(`<!--]--></div></section>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
