import { a as attr, e as escape_html, b as attr_class, d as derived } from "./root.js";
import "@supabase/ssr";
function MobileShell($$renderer, $$props) {
  let {
    viewerName,
    title,
    subtitle,
    activeTab,
    shellBootstrapMode,
    onboardingState = null,
    failurePhase = null,
    failureDetail = null,
    primaryHref = null,
    primaryLabel = null,
    children
  } = $$props;
  const shellTone = derived(() => {
    if (shellBootstrapMode === "load-failed") {
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
  $$renderer.push(`<div class="mobile-shell-frame svelte-kxq9s8" data-testid="mobile-shell-frame"${attr("data-shell-bootstrap", shellBootstrapMode)}${attr("data-onboarding-state", onboardingState ?? "unknown")}><header class="mobile-shell-header framed-panel svelte-kxq9s8"><div class="shell-kicker-row svelte-kxq9s8"><p class="eyebrow svelte-kxq9s8">Caluno pocket shell</p> <span class="viewer-chip svelte-kxq9s8">${escape_html(viewerName)}</span></div> <div class="mobile-shell-copy svelte-kxq9s8"><h1 class="svelte-kxq9s8">${escape_html(title)}</h1> <p class="svelte-kxq9s8">${escape_html(subtitle)}</p></div> <div class="status-ribbon svelte-kxq9s8"><article${attr_class(`status-pill ${shellTone()}`, "svelte-kxq9s8")} data-testid="mobile-shell-status"><span class="svelte-kxq9s8">Shell state</span> <strong class="svelte-kxq9s8">${escape_html(shellLabel())}</strong></article> `);
  if (onboardingState) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<article${attr_class(`status-pill ${onboardingState === "needs-group" ? "tone-warning" : "tone-neutral"}`, "svelte-kxq9s8")}><span class="svelte-kxq9s8">Onboarding</span> <strong class="svelte-kxq9s8">${escape_html(onboardingState)}</strong></article>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> `);
  if (failurePhase) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<article class="status-pill tone-danger svelte-kxq9s8"><span class="svelte-kxq9s8">Failure phase</span> <strong class="svelte-kxq9s8">${escape_html(failurePhase)}</strong></article>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></div> `);
  if (failureDetail) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<p class="shell-caption svelte-kxq9s8">${escape_html(failureDetail)}</p>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></header> <section class="mobile-shell-body svelte-kxq9s8">`);
  children?.($$renderer);
  $$renderer.push(`<!----></section> <nav class="mobile-tab-bar framed-panel svelte-kxq9s8" aria-label="Primary mobile navigation"><a href="/groups"${attr_class("svelte-kxq9s8", void 0, { "active": activeTab === "groups" })}>Groups</a> `);
  if (primaryHref) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<a${attr("href", primaryHref)}${attr_class("svelte-kxq9s8", void 0, { "active": activeTab === "calendar" })}>${escape_html(primaryLabel ?? "Calendar")}</a>`);
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<span class="tab-placeholder svelte-kxq9s8">Calendar locked</span>`);
  }
  $$renderer.push(`<!--]--> <a href="/signin" class="svelte-kxq9s8">Account</a></nav></div>`);
}
function primaryCalendarLandingHref(appShell) {
  return appShell.primaryCalendar ? `/calendars/${appShell.primaryCalendar.id}` : null;
}
export {
  MobileShell as M,
  primaryCalendarLandingHref as p
};
