import { a as attr, e as escape_html, b as attr_class, d as derived } from "./root.js";
import "@sveltejs/kit/internal";
import "./exports.js";
import "./utils.js";
import "@sveltejs/kit/internal/server";
import "./state.svelte.js";
import "./index2.js";
import "./mobile-session.js";
function MobileShell($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      viewerName,
      title,
      subtitle,
      activeTab,
      shellBootstrapMode,
      routeMode,
      snapshotOrigin,
      continuityReason = null,
      lastTrustedRefreshAt = null,
      onboardingState = null,
      failurePhase = null,
      failureDetail = null,
      primaryHref = null,
      primaryLabel = null,
      children
    } = $$props;
    const shellTone = derived(() => {
      if (routeMode === "cached-offline") {
        return "tone-warning";
      }
      if (shellBootstrapMode === "load-failed" || routeMode === "denied") {
        return "tone-danger";
      }
      if (shellBootstrapMode === "needs-group") {
        return "tone-warning";
      }
      return "tone-neutral";
    });
    const shellLabel = derived(() => {
      switch (shellBootstrapMode) {
        case "ready":
          return "trusted-ready";
        case "needs-group":
          return "onboarding-empty";
        case "load-failed":
          return "shell-load-failed";
        case "loading":
          return "loading-trusted-shell";
        default:
          return "idle";
      }
    });
    let signingOut = false;
    $$renderer2.push(`<div class="mobile-shell-frame svelte-kxq9s8" data-testid="mobile-shell-frame"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-route-mode", routeMode)}${attr("data-snapshot-origin", snapshotOrigin)}${attr("data-continuity-reason", continuityReason ?? "none")}${attr("data-last-trusted-refresh-at", lastTrustedRefreshAt ?? "none")}${attr("data-onboarding-state", onboardingState ?? "unknown")}><header class="mobile-shell-header framed-panel svelte-kxq9s8"><div class="shell-kicker-row svelte-kxq9s8"><p class="eyebrow svelte-kxq9s8">Caluno pocket shell</p> <div class="shell-header-actions svelte-kxq9s8"><span class="viewer-chip svelte-kxq9s8">${escape_html(viewerName)}</span> <button class="signout-chip svelte-kxq9s8" type="button"${attr("disabled", signingOut, true)} data-testid="mobile-shell-signout">${escape_html("Sign out")}</button></div></div> <div class="mobile-shell-copy svelte-kxq9s8"><h1 class="svelte-kxq9s8">${escape_html(title)}</h1> <p class="svelte-kxq9s8">${escape_html(subtitle)}</p></div> <div class="status-ribbon svelte-kxq9s8"><article${attr_class(`status-pill ${shellTone()}`, "svelte-kxq9s8")} data-testid="mobile-shell-status"><span class="svelte-kxq9s8">Shell state</span> <strong class="svelte-kxq9s8">${escape_html(shellLabel())}</strong></article> <article${attr_class(
      `status-pill ${routeMode === "cached-offline" ? "tone-warning" : routeMode === "denied" ? "tone-danger" : "tone-neutral"}`,
      "svelte-kxq9s8"
    )}><span class="svelte-kxq9s8">Route mode</span> <strong class="svelte-kxq9s8">${escape_html(routeMode)}</strong></article> <article${attr_class(`status-pill ${snapshotOrigin === "cached-offline" ? "tone-warning" : "tone-neutral"}`, "svelte-kxq9s8")}><span class="svelte-kxq9s8">Snapshot origin</span> <strong class="svelte-kxq9s8">${escape_html(snapshotOrigin)}</strong></article> `);
    if (onboardingState) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-pill ${onboardingState === "needs-group" ? "tone-warning" : "tone-neutral"}`, "svelte-kxq9s8")}><span class="svelte-kxq9s8">Onboarding</span> <strong class="svelte-kxq9s8">${escape_html(onboardingState)}</strong></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (failurePhase) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-pill tone-danger svelte-kxq9s8"><span class="svelte-kxq9s8">Failure phase</span> <strong class="svelte-kxq9s8">${escape_html(failurePhase)}</strong></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (continuityReason) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-pill tone-danger svelte-kxq9s8"><span class="svelte-kxq9s8">Continuity</span> <strong class="svelte-kxq9s8">${escape_html(continuityReason)}</strong></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (failureDetail) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="shell-caption svelte-kxq9s8">${escape_html(failureDetail)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (lastTrustedRefreshAt) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="shell-caption svelte-kxq9s8">Last trusted refresh: ${escape_html(lastTrustedRefreshAt)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></header> <section class="mobile-shell-body svelte-kxq9s8">`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></section> <nav class="mobile-tab-bar framed-panel svelte-kxq9s8" aria-label="Primary mobile navigation"><a href="/groups"${attr_class("svelte-kxq9s8", void 0, { "active": activeTab === "groups" })}>Groups</a> `);
    if (primaryHref) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a${attr("href", primaryHref)}${attr_class("svelte-kxq9s8", void 0, { "active": activeTab === "calendar" })}>${escape_html(primaryLabel ?? "Calendar")}</a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="tab-placeholder svelte-kxq9s8">Calendar locked</span>`);
    }
    $$renderer2.push(`<!--]--> <a href="/signin" class="svelte-kxq9s8">Account</a></nav></div>`);
  });
}
export {
  MobileShell as M
};
