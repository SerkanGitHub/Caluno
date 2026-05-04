import { b as attr_class, a as attr, e as escape_html, d as derived, h as head, c as ensure_array_like, s as store_get, u as unsubscribe_stores } from "../../../chunks/root.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { p as page } from "../../../chunks/index2.js";
import { M as MobileShell } from "../../../chunks/MobileShell.js";
/* empty css                                                                       */
import { p as primaryCalendarLandingHref } from "../../../chunks/load-app-shell.js";
import { c as clearTrustedNotificationCalendarScope, n as notificationRouteDiagnostics } from "../../../chunks/router.js";
import "@capacitor/preferences";
import "../../../chunks/repository.js";
import "@capacitor/app";
import "@capacitor/network";
import "@capacitor/local-notifications";
import "@capacitor/core";
import "@capacitor/push-notifications";
import "@supabase/ssr";
const NOTIFICATION_REMOTE_SUBSCRIPTION_STATUSES = [
  "unknown",
  "unsubscribed",
  "subscribed",
  "syncing",
  "degraded",
  "provider-unconfigured"
];
const NOTIFICATION_REASON_CODES = [
  "installation-unavailable",
  "installation-registration-invalid",
  "storage-timeout",
  "storage-unavailable",
  "storage-malformed",
  "scope-unavailable",
  "calendar-id-invalid",
  "calendar-out-of-scope",
  "sync-failed",
  "timeout",
  "malformed-response",
  "duplicate-preference-rows",
  "persistence-denied",
  "provider-unconfigured",
  "permission-denied",
  "registration-failed",
  "schedule-unavailable",
  "path-rejected"
];
function isNotificationRemoteSubscriptionStatus(value) {
  return typeof value === "string" && NOTIFICATION_REMOTE_SUBSCRIPTION_STATUSES.includes(value);
}
function isNotificationReasonCode(value) {
  return typeof value === "string" && NOTIFICATION_REASON_CODES.includes(value);
}
const NOTIFICATION_PERMISSIONS = ["unknown", "granted", "denied", "unsupported"];
const NOTIFICATION_LOCAL_STATES = ["unknown", "ready", "blocked", "degraded"];
const NOTIFICATION_SYNC_PHASES = [
  "idle",
  "bootstrapping-installation",
  "loading-preferences",
  "syncing-preference",
  "ready",
  "degraded"
];
const NOTIFICATION_INSTALLATION_STATUSES = ["ready", "unavailable"];
const NOTIFICATION_LOCAL_SYNC_PHASES = ["idle", "syncing", "ready", "degraded"];
const NOTIFICATION_REMOTE_REGISTRATION_STATES = [
  "unknown",
  "registered",
  "denied",
  "failed",
  "unsupported"
];
function presentCalendarNotificationState(params) {
  const interactive = params.interactive ?? false;
  const saving = params.saving ?? false;
  const state = params.state ?? null;
  if (!state) {
    return {
      calendarId: params.calendarId,
      desiredEnabled: false,
      permission: "unknown",
      localReminders: "unknown",
      remoteSubscription: "degraded",
      phase: interactive ? saving ? "syncing-preference" : "loading-preferences" : "degraded",
      reason: interactive ? null : "scope-unavailable",
      detail: params.fallbackDetail ?? (interactive ? "Notification state is still loading for this calendar." : "Trusted notification scope is unavailable, so this control stayed read only."),
      installationStatus: interactive ? "ready" : "unavailable",
      localSyncPhase: interactive ? "syncing" : "idle",
      localReminderCount: 0,
      lastReminderResyncAt: null,
      remoteRegistration: "unknown",
      readOnly: true,
      malformed: false,
      saving
    };
  }
  const malformed = !isValidNotificationState(state);
  const desiredEnabled = typeof state.desiredEnabled === "boolean" ? state.desiredEnabled : false;
  const permission = includesValue(NOTIFICATION_PERMISSIONS, state.permission) ? state.permission : "unknown";
  const localReminders = includesValue(NOTIFICATION_LOCAL_STATES, state.localReminders) ? state.localReminders : "degraded";
  const remoteSubscription = isNotificationRemoteSubscriptionStatus(state.remoteSubscription) ? state.remoteSubscription : "degraded";
  const phase = malformed ? "degraded" : saving ? "syncing-preference" : includesValue(NOTIFICATION_SYNC_PHASES, state.phase) ? state.phase : "degraded";
  const reason = malformed ? "malformed-response" : state.reason == null ? null : isNotificationReasonCode(state.reason) ? state.reason : "malformed-response";
  return {
    calendarId: params.calendarId,
    desiredEnabled,
    permission,
    localReminders,
    remoteSubscription,
    phase,
    reason,
    detail: malformed ? "Notification runtime state was malformed, so this control stayed degraded and read only." : typeof state.detail === "string" && state.detail.trim().length > 0 ? state.detail : params.fallbackDetail ?? "Notification state is available for this calendar.",
    installationStatus: includesValue(NOTIFICATION_INSTALLATION_STATUSES, state.installationStatus) ? state.installationStatus : interactive ? "ready" : "unavailable",
    localSyncPhase: includesValue(NOTIFICATION_LOCAL_SYNC_PHASES, state.localSyncPhase) ? state.localSyncPhase : saving ? "syncing" : localReminders === "ready" ? "ready" : localReminders === "degraded" ? "degraded" : "idle",
    localReminderCount: typeof state.localReminderCount === "number" && state.localReminderCount >= 0 ? state.localReminderCount : 0,
    lastReminderResyncAt: typeof state.lastReminderResyncAt === "string" ? state.lastReminderResyncAt : null,
    remoteRegistration: includesValue(NOTIFICATION_REMOTE_REGISTRATION_STATES, state.remoteRegistration) ? state.remoteRegistration : "unknown",
    readOnly: malformed || !interactive || saving,
    malformed,
    saving
  };
}
function isValidNotificationState(state) {
  return typeof state.desiredEnabled === "boolean" && includesValue(NOTIFICATION_PERMISSIONS, state.permission) && includesValue(NOTIFICATION_LOCAL_STATES, state.localReminders) && isNotificationRemoteSubscriptionStatus(state.remoteSubscription) && includesValue(NOTIFICATION_SYNC_PHASES, state.phase) && (state.reason == null || isNotificationReasonCode(state.reason));
}
function includesValue(values, candidate) {
  return typeof candidate === "string" && values.includes(candidate);
}
function CalendarNotificationToggle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      calendarId,
      calendarName,
      state = null,
      interactive = false,
      saving = false,
      fallbackDetail = null,
      surface = "group-row",
      onToggle = null
    } = $$props;
    const presentation = derived(() => presentCalendarNotificationState({ calendarId, state, interactive, saving, fallbackDetail }));
    const toggleId = derived(() => `calendar-notification-toggle-${calendarId}`);
    const surfaceTone = derived(() => {
      if (presentation().phase === "degraded") {
        return "tone-warning";
      }
      if (presentation().desiredEnabled) {
        return "tone-active";
      }
      return "tone-neutral";
    });
    const statusCopy = derived(() => {
      if (presentation().saving) {
        return "Saving this calendar state.";
      }
      if (presentation().reason === "permission-denied") {
        return "Permission is denied, so the toggle keeps intent visible while reminders stay blocked.";
      }
      if (presentation().remoteSubscription === "degraded" || presentation().remoteSubscription === "provider-unconfigured") {
        return "Remote shared-calendar changes are degraded, even if local reminders still exist.";
      }
      if (presentation().readOnly) {
        return "This control is visible but read only until trusted notification state settles.";
      }
      return presentation().desiredEnabled ? "This calendar is trying to keep both local reminders and shared-calendar changes in sync." : "This calendar will stay quiet until you enable both reminder and shared-change delivery.";
    });
    $$renderer2.push(`<section${attr_class(`notification-toggle framed-panel ${surfaceTone()} ${surface === "calendar-panel" ? "calendar-panel" : "group-row"}`, "svelte-153fiow")} data-testid="calendar-notification-toggle"${attr("data-calendar-id", calendarId)}${attr("data-notification-enabled", presentation().desiredEnabled ? "true" : "false")}${attr("data-notification-permission", presentation().permission)}${attr("data-local-reminders", presentation().localReminders)}${attr("data-remote-subscription", presentation().remoteSubscription)}${attr("data-notification-phase", presentation().phase)}${attr("data-notification-reason", presentation().reason ?? "none")}${attr("data-notification-read-only", presentation().readOnly ? "true" : "false")}${attr("data-local-sync-phase", presentation().localSyncPhase)}${attr("data-remote-registration", presentation().remoteRegistration)}><div class="toggle-header svelte-153fiow"><div class="toggle-copy svelte-153fiow"><p class="toggle-kicker svelte-153fiow">Calm notifications</p> <h3 class="svelte-153fiow">${escape_html(calendarName)}</h3> <p class="svelte-153fiow">${escape_html(statusCopy())}</p></div> <div${attr_class(`switch ${presentation().readOnly ? "is-readonly" : ""}`, "svelte-153fiow")}><button${attr("id", toggleId())} data-testid="calendar-notification-switch" type="button" role="switch"${attr("aria-checked", presentation().desiredEnabled)}${attr("aria-label", `Toggle calm notifications for ${calendarName}`)} class="switch-button svelte-153fiow"${attr("disabled", presentation().readOnly || !onToggle, true)}><span class="switch-track svelte-153fiow" aria-hidden="true"><span class="switch-thumb svelte-153fiow"></span></span></button> <span class="switch-label svelte-153fiow">${escape_html(presentation().desiredEnabled ? "On" : "Off")}</span></div></div> <div class="state-grid svelte-153fiow"><article class="state-pill svelte-153fiow"><span class="svelte-153fiow">Permission</span> <strong class="svelte-153fiow">${escape_html(presentation().permission)}</strong></article> <article class="state-pill svelte-153fiow"><span class="svelte-153fiow">Local reminders</span> <strong class="svelte-153fiow">${escape_html(presentation().localReminders)}</strong></article> <article class="state-pill svelte-153fiow"><span class="svelte-153fiow">Shared changes</span> <strong class="svelte-153fiow">${escape_html(presentation().remoteSubscription)}</strong></article> <article class="state-pill svelte-153fiow"><span class="svelte-153fiow">Phase</span> <strong class="svelte-153fiow">${escape_html(presentation().phase)}</strong></article></div> <div class="diag-strip svelte-153fiow"><span class="diag-chip svelte-153fiow">reason: ${escape_html(presentation().reason ?? "none")}</span> <span class="diag-chip svelte-153fiow">reminders: ${escape_html(presentation().localReminderCount)}</span> <span class="diag-chip svelte-153fiow">registration: ${escape_html(presentation().remoteRegistration)}</span> `);
    if (presentation().lastReminderResyncAt) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="diag-chip svelte-153fiow">last sync: ${escape_html(presentation().lastReminderResyncAt)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <p class="toggle-detail svelte-153fiow">${escape_html(presentation().detail)}</p></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const authState = derived(() => page.data.authState);
    const protectedEntry = derived(() => page.data.protectedEntry);
    const routeDiagnostics = derived(() => store_get($$store_subs ??= {}, "$notificationRouteDiagnostics", notificationRouteDiagnostics));
    let shellResult = null;
    let shellBootstrapMode = "loading";
    let notificationPendingCalendarId = null;
    let notificationFailure = null;
    let notificationState = null;
    let notificationRuntime = null;
    let notificationSubscription = null;
    const shellFailure = derived(() => null);
    const appShell = derived(() => null);
    const primaryHref = derived(() => appShell() ? primaryCalendarLandingHref(appShell()) : null);
    const hasError = derived(() => shellFailure() !== null);
    const routeMode = derived(() => protectedEntry().routeMode);
    const snapshotOrigin = derived(() => protectedEntry().snapshotOrigin);
    const continuityReason = derived(() => protectedEntry().continuityReason);
    const lastTrustedRefreshAt = derived(() => protectedEntry().lastTrustedRefreshAt);
    const permittedCalendarIds = derived(() => appShell()?.calendars.map((calendar) => calendar.id) ?? null);
    const canManageNotifications = derived(() => Boolean(authState().phase === "authenticated" && authState().user && permittedCalendarIds() && permittedCalendarIds().length > 0));
    async function destroyNotificationRuntime() {
      notificationSubscription?.();
      notificationSubscription = null;
      const activeRuntime = notificationRuntime;
      notificationRuntime = null;
      notificationState = null;
      if (activeRuntime) {
        await activeRuntime.destroy();
      }
    }
    async function toggleCalendarNotification(calendarId, desiredEnabled) {
      if (!notificationRuntime) {
        notificationFailure = {
          reason: "scope-unavailable",
          detail: "The notification runtime is unavailable, so this toggle stayed read only."
        };
        return;
      }
      notificationPendingCalendarId = calendarId;
      notificationFailure = null;
      try {
        const nextState = await notificationRuntime.setCalendarEnabled({ calendarId, desiredEnabled });
        if (!nextState) {
          notificationFailure = {
            reason: "save-failed",
            detail: "The requested calendar fell outside the trusted scope before the preference write completed."
          };
        }
      } catch (error) {
        notificationFailure = {
          reason: "save-failed",
          detail: error instanceof Error ? error.message : "Saving the calendar notification preference failed."
        };
      } finally {
        notificationPendingCalendarId = null;
      }
    }
    onDestroy(() => {
      clearTrustedNotificationCalendarScope();
      void destroyNotificationRuntime();
    });
    head("1sgss7h", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Groups • Caluno Mobile</title>`);
      });
    });
    MobileShell($$renderer2, {
      viewerName: appShell()?.viewer.displayName ?? authState().displayName ?? "Caluno member",
      title: "Trusted groups, cut for a phone.",
      subtitle: "Your mobile shell opens only the memberships, calendars, and join-code metadata already proven online or previously stored inside trusted continuity.",
      activeTab: "groups",
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
      children: ($$renderer3) => {
        $$renderer3.push(`<section class="hero-stack svelte-1sgss7h" data-testid="groups-shell"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-route-mode", routeMode())}${attr("data-snapshot-origin", snapshotOrigin())}${attr("data-continuity-reason", continuityReason() ?? "none")}${attr("data-last-trusted-refresh-at", lastTrustedRefreshAt() ?? "none")}${attr("data-onboarding-state", appShell()?.onboardingState ?? "unknown")}${attr("data-notification-route-result", routeDiagnostics().code)}${attr("data-notification-route-reason", routeDiagnostics().reason ?? "none")}><article class="hero-card framed-panel svelte-1sgss7h"><div><p class="panel-kicker svelte-1sgss7h">Pocket overview</p> <h2 class="svelte-1sgss7h">`);
        if (routeMode() === "cached-offline") {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`Trusted continuity reopened your permitted groups.`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`${escape_html(appShell()?.primaryCalendar ? "Your first tap can be the right calendar." : "Protected scope is still settling.")}`);
        }
        $$renderer3.push(`<!--]--></h2></div> <p class="panel-copy svelte-1sgss7h">`);
        if (hasError()) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`Protected content stayed hidden because the shell loader hit a typed failure.`);
        } else if (routeMode() === "cached-offline") {
          $$renderer3.push("<!--[2-->");
          $$renderer3.push(`The live session is unavailable, but this device reopened only the previously trusted shell snapshot.`);
        } else if (protectedEntry().routeMode === "denied") {
          $$renderer3.push("<!--[3-->");
          $$renderer3.push(`Cached continuity stayed closed, so protected content remains hidden until trusted auth returns.`);
        } else if (appShell()?.onboardingState === "needs-group") {
          $$renderer3.push("<!--[4-->");
          $$renderer3.push(`This account has no permitted memberships yet, so the shell stays in an explicit onboarding-empty mode.`);
        } else if (appShell()?.primaryCalendar) {
          $$renderer3.push("<!--[5-->");
          $$renderer3.push(`The shared primary-calendar helper already picked the first truthful landing target for this session.`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`The shell resolved without a primary calendar, so the groups inventory remains the only allowed surface.`);
        }
        $$renderer3.push(`<!--]--></p> <div class="hero-actions svelte-1sgss7h">`);
        if (appShell()?.primaryCalendar) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<a class="button button-primary svelte-1sgss7h"${attr("href", primaryHref() ?? "/groups")} data-testid="mobile-primary-calendar-link">Open ${escape_html(appShell().primaryCalendar.name)}</a>`);
        } else if (hasError()) {
          $$renderer3.push("<!--[2-->");
          $$renderer3.push(`<button class="button button-primary svelte-1sgss7h" type="button"${attr("disabled", !shellFailure()?.retryable, true)}>Retry trusted load</button>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<a class="button button-primary svelte-1sgss7h"${attr("href", protectedEntry().signInHref ?? "/signin")}>Open sign-in</a>`);
        }
        $$renderer3.push(`<!--]--> <a class="button button-secondary svelte-1sgss7h"${attr("href", protectedEntry().signInHref ?? "/signin")}>Account state</a></div></article> `);
        if (protectedEntry().routeMode === "denied") {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<article class="signal-card framed-panel tone-danger svelte-1sgss7h" data-testid="mobile-continuity-denied"><span class="signal-card__label svelte-1sgss7h">Continuity denied</span> <strong class="svelte-1sgss7h">${escape_html(protectedEntry().denialReasonCode ?? "AUTH_REQUIRED")}</strong> <p class="svelte-1sgss7h">${escape_html(protectedEntry().continuityDetail ?? "Protected content stayed closed because trusted continuity was unavailable.")}</p> `);
          if (protectedEntry().signInHref) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<a class="button button-secondary svelte-1sgss7h"${attr("href", protectedEntry().signInHref)}>Sign in again</a>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></article>`);
        } else if (appShell()?.onboardingState === "needs-group") {
          $$renderer3.push("<!--[2-->");
          $$renderer3.push(`<article class="signal-card framed-panel tone-warning svelte-1sgss7h" data-testid="mobile-shell-onboarding"><span class="signal-card__label svelte-1sgss7h">Onboarding state</span> <strong class="svelte-1sgss7h">needs-group</strong> <p class="svelte-1sgss7h">No groups were returned by trusted memberships, so the phone shell stops here instead of guessing a calendar.</p></article>`);
        } else if (appShell()) {
          $$renderer3.push("<!--[3-->");
          $$renderer3.push(`<article class="signal-card framed-panel tone-neutral svelte-1sgss7h"><span class="signal-card__label svelte-1sgss7h">Trusted inventory</span> <strong class="svelte-1sgss7h">${escape_html(appShell().groups.length)} groups / ${escape_html(appShell().calendars.length)} calendars</strong> <p class="svelte-1sgss7h">${escape_html(routeMode() === "cached-offline" ? "All navigation below comes from the stored trusted shell snapshot and remains locked to the previously synced scope." : "All navigation below comes directly from the shaped app-shell inventory, not from route guessing.")}</p></article>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (appShell() && notificationFailure) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<article class="signal-card framed-panel tone-warning svelte-1sgss7h" data-testid="mobile-notification-runtime-failure"><span class="signal-card__label svelte-1sgss7h">Notification state</span> <strong class="svelte-1sgss7h">${escape_html(notificationFailure.reason)}</strong> <p class="svelte-1sgss7h">${escape_html(notificationFailure.detail)}</p></article>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></section> <section class="group-stack svelte-1sgss7h">`);
        if (appShell() && appShell().groups.length > 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(appShell().groups);
          for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
            let group = each_array[$$index_1];
            $$renderer3.push(`<article class="group-card framed-panel svelte-1sgss7h" data-testid="mobile-group-card"><div class="group-card__header svelte-1sgss7h"><div><p class="panel-kicker svelte-1sgss7h">${escape_html(group.role === "owner" ? "Owner scope" : "Member scope")}</p> <h3 class="svelte-1sgss7h">${escape_html(group.name)}</h3></div> <span${attr_class(`pill pill-${group.joinCodeStatus}`, "svelte-1sgss7h")}>${escape_html(group.joinCodeStatus)}</span></div> `);
            if (group.joinCode) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<div class="code-strip svelte-1sgss7h"><span class="svelte-1sgss7h">Visible join code</span> <code class="svelte-1sgss7h">${escape_html(group.joinCode)}</code></div>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--> <div class="calendar-list svelte-1sgss7h"><!--[-->`);
            const each_array_1 = ensure_array_like(group.calendars);
            for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
              let calendar = each_array_1[$$index];
              $$renderer3.push(`<article class="calendar-card svelte-1sgss7h" data-testid="mobile-group-calendar-card"${attr("data-calendar-id", calendar.id)}><a class="calendar-link svelte-1sgss7h"${attr("href", `/calendars/${calendar.id}`)}><strong class="svelte-1sgss7h">${escape_html(calendar.name)}</strong> <span class="svelte-1sgss7h">${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a> `);
              CalendarNotificationToggle($$renderer3, {
                calendarId: calendar.id,
                calendarName: calendar.name,
                state: notificationState?.calendars[calendar.id] ?? null,
                interactive: canManageNotifications(),
                saving: notificationPendingCalendarId === calendar.id,
                fallbackDetail: notificationFailure?.detail ?? (routeMode() === "cached-offline" ? "Trusted continuity reopened this calendar inventory, but live notification writes require a trusted session." : "Notification state is still bootstrapping for this calendar."),
                onToggle: (desiredEnabled) => toggleCalendarNotification(calendar.id, desiredEnabled)
              });
              $$renderer3.push(`<!----></article>`);
            }
            $$renderer3.push(`<!--]--></div></article>`);
          }
          $$renderer3.push(`<!--]-->`);
        } else if (appShell()) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<article class="empty-card framed-panel svelte-1sgss7h"><p class="panel-kicker svelte-1sgss7h">Awaiting first membership</p> <h3 class="svelte-1sgss7h">No permitted groups yet.</h3> <p class="panel-copy svelte-1sgss7h">Once trusted memberships exist, this route will list only the groups and calendars returned by that inventory load.</p></article>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></section>`);
      }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
