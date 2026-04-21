import { h as head, a as attr, e as escape_html, b as attr_class, d as derived, s as store_get, u as unsubscribe_stores } from "../../../chunks/root.js";
import { p as page } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { m as mobileSession } from "../../../chunks/mobile-session.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let email = "";
    let password = "";
    let submitting = false;
    const authState = derived(() => store_get($$store_subs ??= {}, "$mobileSession", mobileSession));
    const flow = derived(() => page.url.searchParams.get("flow")?.trim() ?? "ready");
    const reason = derived(() => page.url.searchParams.get("reason")?.trim().toUpperCase() ?? null);
    const surface = derived(() => resolveSurface(authState(), flow(), reason()));
    const formBlocked = derived(() => authState().phase === "error" && authState().failurePhase === "config");
    function resolveSurface(state, currentFlow, currentReason) {
      if (state.phase === "authenticated") {
        return {
          eyebrow: "Trusted session ready",
          title: "Your mobile session is trusted.",
          detail: state.detail,
          tone: "neutral",
          stateLabel: state.displayName ? `trusted for ${state.displayName}` : "trusted",
          reasonCode: null
        };
      }
      if (state.phase === "invalid-session") {
        return {
          eyebrow: "Session reset",
          title: "We refused an untrusted saved session.",
          detail: state.detail,
          tone: "warning",
          stateLabel: "invalid-session",
          reasonCode: state.reasonCode
        };
      }
      if (state.phase === "error") {
        return {
          eyebrow: state.failurePhase === "config" ? "Configuration blocked" : "Auth needs attention",
          title: state.failurePhase === "config" ? "Public Supabase config is missing." : state.failurePhase === "sign-out" ? "Sign-out could not be confirmed." : "Trusted auth could not finish cleanly.",
          detail: state.detail,
          tone: "danger",
          stateLabel: "auth-error",
          reasonCode: state.reasonCode
        };
      }
      if (state.phase === "bootstrapping") {
        return {
          eyebrow: "Validating session",
          title: "Checking for a trusted mobile session.",
          detail: state.detail,
          tone: "neutral",
          stateLabel: "bootstrapping",
          reasonCode: null
        };
      }
      if (currentFlow === "invalid-session") {
        return {
          eyebrow: "Session reset",
          title: "Sign in again to reopen your calendars.",
          detail: "A saved session was rejected during trusted validation, so Caluno kept the mobile shell closed until a fresh sign-in succeeds.",
          tone: "warning",
          stateLabel: "invalid-session",
          reasonCode: currentReason ?? "INVALID_SESSION"
        };
      }
      if (currentFlow === "auth-required") {
        return {
          eyebrow: "Protected route",
          title: "Sign in to open your permitted calendars.",
          detail: "Protected mobile routes redirect here until a trusted session exists, so stale local auth never reopens the shell silently.",
          tone: "warning",
          stateLabel: "signed-out",
          reasonCode: currentReason ?? "AUTH_REQUIRED"
        };
      }
      if (currentFlow === "signed-out") {
        return {
          eyebrow: "Signed out",
          title: "This device is safely signed out.",
          detail: "The trusted mobile session was cleared before protected routes could reopen, so the next shell entry must start from a fresh sign-in.",
          tone: "neutral",
          stateLabel: "signed-out",
          reasonCode: currentReason ?? "AUTH_REQUIRED"
        };
      }
      return {
        eyebrow: "Trusted entrypoint",
        title: "Open Caluno with email and password.",
        detail: "This mobile entrypoint validates saved sessions on boot and stays explicit about signed-out, invalid-session, and auth-error states.",
        tone: "neutral",
        stateLabel: "signed-out",
        reasonCode: currentReason
      };
    }
    head("iq265b", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sign in • Caluno Mobile</title>`);
      });
    });
    $$renderer2.push(`<main class="auth-shell svelte-iq265b" data-testid="mobile-signin-entrypoint"${attr("data-signin-flow", flow())}${attr("data-signin-entrypoint", flow() === "signed-out" ? "signed-out-entrypoint" : "mobile-signin-entrypoint")}><section class="hero-card svelte-iq265b"><p class="eyebrow svelte-iq265b">${escape_html(surface().eyebrow)}</p> <h1 class="svelte-iq265b">${escape_html(surface().title)}</h1> <p class="lede svelte-iq265b">${escape_html(surface().detail)}</p> <div class="signal-grid svelte-iq265b"><article${attr_class(`signal-card tone-${surface().tone}`, "svelte-iq265b")} data-testid="mobile-auth-state"${attr("data-auth-phase", authState().phase)}${attr("data-auth-surface-state", surface().stateLabel)}${attr("data-auth-failure-phase", authState().failurePhase ?? "none")}${attr("data-auth-reason", surface().reasonCode ?? "none")}><span class="signal-card__label svelte-iq265b">Trusted auth state</span> <strong class="svelte-iq265b">${escape_html(surface().stateLabel)}</strong> <p class="svelte-iq265b">${escape_html(surface().detail)}</p> `);
    if (surface().reasonCode) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code class="svelte-iq265b">${escape_html(surface().reasonCode)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> <article class="signal-card tone-neutral svelte-iq265b" data-testid="mobile-auth-scope-promise"><span class="signal-card__label svelte-iq265b">Scope promise</span> <strong class="svelte-iq265b">No guessed calendars</strong> <p class="svelte-iq265b">Only memberships and calendars backed by a trusted session are allowed to open the mobile shell.</p></article></div></section> <section class="form-card svelte-iq265b"><div class="form-copy svelte-iq265b"><p class="panel-kicker svelte-iq265b">Email/password access</p> <h2 class="svelte-iq265b">Request a trusted mobile session.</h2> <p class="svelte-iq265b">Mobile stays on password auth in this slice. Cached sessions are revalidated on boot before the
        protected shell can open.</p></div> `);
    if (formBlocked()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="blocked-state svelte-iq265b" data-testid="mobile-auth-config-error"><strong class="svelte-iq265b">Configuration required</strong> <p class="svelte-iq265b">${escape_html(authState().detail)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form class="auth-form svelte-iq265b" data-testid="mobile-signin-form"><label class="field svelte-iq265b"><span>Email</span> <input class="input svelte-iq265b" type="email" name="email" autocomplete="email" placeholder="alice@example.com"${attr("value", email)} data-testid="mobile-signin-email" required=""/></label> <label class="field svelte-iq265b"><span>Password</span> <input class="input svelte-iq265b" type="password" name="password" autocomplete="current-password" placeholder="••••••••••••"${attr("value", password)} data-testid="mobile-signin-password" required=""/></label> <button class="button button-primary svelte-iq265b" type="submit"${attr("disabled", submitting, true)} data-testid="mobile-signin-submit">${escape_html("Request trusted session")}</button></form>`);
    }
    $$renderer2.push(`<!--]--> <div class="actions svelte-iq265b" data-testid="mobile-auth-actions"><button class="button button-secondary svelte-iq265b" type="button"${attr("disabled", submitting, true)}>Retry validation</button> <button class="button button-secondary svelte-iq265b" type="button"${attr("disabled", submitting, true)}>Reset to sign-in</button> `);
    if (authState().phase === "authenticated") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="button button-secondary svelte-iq265b" type="button"${attr("disabled", submitting, true)}>Sign out</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></section></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
