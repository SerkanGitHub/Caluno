import { h as head, d as derived, e as escape_html, a as attr, c as ensure_array_like, b as attr_class } from "../../../../chunks/root.js";
import { p as page } from "../../../../chunks/index2.js";
import { M as MobileShell } from "../../../../chunks/MobileShell.js";
import "../../../../chunks/mobile-session.js";
import { p as primaryCalendarLandingHref } from "../../../../chunks/load-app-shell.js";
function describeDeniedCalendarReason(reason) {
  switch (reason) {
    case "calendar-id-invalid":
      return {
        badge: "Route rejected",
        title: "That calendar address is malformed.",
        detail: "The route parameter was rejected before any trusted calendar lookup could run."
      };
    case "calendar-missing":
      return {
        badge: "Lookup denied",
        title: "That calendar does not exist in your permitted scope.",
        detail: "Caluno failed closed instead of rendering an empty calendar for a guessed or stale id."
      };
    case "group-membership-missing":
      return {
        badge: "Access denied",
        title: "Your session is not a member of the group behind this calendar.",
        detail: "The calendar id was recognized, but membership proof was missing, so the view stayed locked."
      };
    case "anonymous":
      return {
        badge: "Authentication required",
        title: "Sign in before opening protected calendars.",
        detail: "Calendar access is resolved only for trusted authenticated members."
      };
  }
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const authState = derived(() => page.data.authState);
    const protectedEntry = derived(() => page.data.protectedEntry);
    const attemptedCalendarId = derived(() => page.params.calendarId ?? "");
    let shellResult = null;
    let shellBootstrapMode = "loading";
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
    head("7ipbkm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(activeCalendar() ? `${activeCalendar().name} • Caluno Mobile` : "Calendar access • Caluno Mobile")}</title>`);
      });
    });
    MobileShell($$renderer2, {
      viewerName: appShell()?.viewer.displayName ?? authState().displayName ?? "Caluno member",
      title: activeCalendar() ? activeCalendar().name : "Calendar access resolved from trusted scope.",
      subtitle: "This route never probes arbitrary calendar ids. It resolves the attempted id only against trusted online inventory or a previously synced cached continuity snapshot.",
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
      children: ($$renderer3) => {
        $$renderer3.push(`<section class="calendar-stack svelte-7ipbkm" data-testid="calendar-route-state"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-route-mode", routeMode())}${attr("data-snapshot-origin", snapshotOrigin())}${attr("data-continuity-reason", continuityReason() ?? "none")}${attr("data-last-trusted-refresh-at", lastTrustedRefreshAt() ?? "none")}${attr("data-denied-reason", deniedState()?.reason ?? "none")}${attr("data-failure-phase", deniedState()?.failurePhase ?? "none")}${attr("data-attempted-calendar-id", attemptedCalendarId())}>`);
        if (shellFailure()) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-7ipbkm" data-testid="mobile-shell-load-failure"><p class="panel-kicker svelte-7ipbkm">Shell load failed</p> <h2 class="svelte-7ipbkm">Protected content stayed hidden.</h2> <p class="panel-copy svelte-7ipbkm">${escape_html(shellFailure().detail)}</p> <div class="meta-strip svelte-7ipbkm"><code class="svelte-7ipbkm">${escape_html(shellFailure().reasonCode)}</code> <code class="svelte-7ipbkm">${escape_html(shellFailure().failurePhase)}</code></div> <button class="button button-primary svelte-7ipbkm" type="button"${attr("disabled", !shellFailure().retryable, true)}>Retry trusted load</button></article>`);
        } else if (protectedEntry().routeMode === "denied") {
          $$renderer3.push("<!--[3-->");
          $$renderer3.push(`<article class="hero-card framed-panel tone-danger svelte-7ipbkm" data-testid="mobile-continuity-denied"><p class="panel-kicker svelte-7ipbkm">Continuity denied</p> <h2 class="svelte-7ipbkm">Protected content stayed closed.</h2> <p class="panel-copy svelte-7ipbkm">${escape_html(protectedEntry().continuityDetail ?? "Cached continuity was unavailable or rejected, so the route failed closed.")}</p> <div class="facts-grid denied-grid svelte-7ipbkm"><div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Reason</dt> <dd class="svelte-7ipbkm">${escape_html(protectedEntry().denialReasonCode ?? "AUTH_REQUIRED")}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Route mode</dt> <dd class="svelte-7ipbkm">${escape_html(routeMode())}</dd></div> <div class="svelte-7ipbkm"><dt class="svelte-7ipbkm">Attempted id</dt> <dd class="svelte-7ipbkm"><code class="svelte-7ipbkm">${escape_html(attemptedCalendarId())}</code></dd></div></div> <div class="hero-actions svelte-7ipbkm"><a class="button button-primary svelte-7ipbkm"${attr("href", protectedEntry().signInHref ?? "/signin")}>Sign in again</a> <a class="button button-secondary svelte-7ipbkm" href="/groups">Return to groups</a></div></article>`);
        } else if (deniedState() && deniedDetail()) {
          $$renderer3.push("<!--[4-->");
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
        if (appShell()?.calendars?.length) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<section class="inventory-card framed-panel svelte-7ipbkm"><div class="inventory-header svelte-7ipbkm"><div><p class="panel-kicker svelte-7ipbkm">Visible inventory</p> <h3 class="svelte-7ipbkm">Only already-permitted calendars appear below.</h3></div> <span class="pill svelte-7ipbkm">${escape_html(appShell().calendars.length)} visible</span></div> <div class="calendar-list svelte-7ipbkm"><!--[-->`);
          const each_array = ensure_array_like(appShell().calendars);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let calendar = each_array[$$index];
            $$renderer3.push(`<a${attr_class(`calendar-link ${activeCalendar()?.id === calendar.id ? "active" : ""}`, "svelte-7ipbkm")}${attr("href", `/calendars/${calendar.id}`)}><strong>${escape_html(calendar.name)}</strong> <span class="svelte-7ipbkm">${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
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
