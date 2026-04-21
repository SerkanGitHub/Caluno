import { h as head, d as derived, a as attr, e as escape_html, c as ensure_array_like, b as attr_class } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { p as page } from "../../../chunks/index2.js";
import { M as MobileShell } from "../../../chunks/MobileShell.js";
import { p as primaryCalendarLandingHref } from "../../../chunks/load-app-shell.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const authState = derived(() => page.data.authState);
    const protectedEntry = derived(() => page.data.protectedEntry);
    let shellResult = null;
    let shellBootstrapMode = "loading";
    const shellFailure = derived(() => null);
    const appShell = derived(() => null);
    const primaryHref = derived(() => appShell() ? primaryCalendarLandingHref(appShell()) : null);
    const hasError = derived(() => shellFailure() !== null);
    const routeMode = derived(() => protectedEntry().routeMode);
    const snapshotOrigin = derived(() => protectedEntry().snapshotOrigin);
    const continuityReason = derived(() => protectedEntry().continuityReason);
    const lastTrustedRefreshAt = derived(() => protectedEntry().lastTrustedRefreshAt);
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
        $$renderer3.push(`<section class="hero-stack svelte-1sgss7h" data-testid="groups-shell"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-route-mode", routeMode())}${attr("data-snapshot-origin", snapshotOrigin())}${attr("data-continuity-reason", continuityReason() ?? "none")}${attr("data-last-trusted-refresh-at", lastTrustedRefreshAt() ?? "none")}${attr("data-onboarding-state", appShell()?.onboardingState ?? "unknown")}><article class="hero-card framed-panel svelte-1sgss7h"><div><p class="panel-kicker svelte-1sgss7h">Pocket overview</p> <h2 class="svelte-1sgss7h">`);
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
              $$renderer3.push(`<a class="calendar-link svelte-1sgss7h"${attr("href", `/calendars/${calendar.id}`)}><strong class="svelte-1sgss7h">${escape_html(calendar.name)}</strong> <span class="svelte-1sgss7h">${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
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
  });
}
export {
  _page as default
};
