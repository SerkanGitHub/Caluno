import { h as head, a as attr, b as attr_class, e as escape_html, d as derived } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    function buildDestination() {
      if (data.authState.phase === "authenticated") {
        return "/groups?landing=primary";
      }
      const reason = data.authState.phase === "invalid-session" ? "INVALID_SESSION" : "AUTH_REQUIRED";
      const flow = data.authState.phase === "invalid-session" ? "invalid-session" : "auth-required";
      return `/signin?flow=${flow}&reason=${reason}&returnTo=${encodeURIComponent("/groups?landing=primary")}`;
    }
    const handoffLabel = derived(() => {
      switch (data.authState.phase) {
        case "authenticated":
          return data.authState.displayName ? `trusted for ${data.authState.displayName}` : "trusted";
        case "invalid-session":
          return "invalid-session";
        case "error":
          return "auth-error";
        case "signed-out":
          return "signed-out";
        default:
          return "bootstrapping";
      }
    });
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Caluno Mobile</title>`);
      });
    });
    $$renderer2.push(`<main class="handoff-shell svelte-1uha8ag"><section class="handoff-card svelte-1uha8ag" data-testid="mobile-auth-handoff"${attr("data-auth-phase", data.authState.phase)}><p class="eyebrow svelte-1uha8ag">Caluno mobile handoff</p> <h1 class="svelte-1uha8ag">Trusted mobile auth decides the first route.</h1> <p class="copy svelte-1uha8ag">The mobile shell waits for explicit session validation before opening protected calendars. While
      that settles, this root route stays an honest handoff surface instead of a starter placeholder.</p> <article${attr_class(
      `signal-card tone-${data.authState.phase === "error" ? "danger" : data.authState.phase === "invalid-session" ? "warning" : "neutral"}`,
      "svelte-1uha8ag"
    )}><span class="signal-card__label svelte-1uha8ag">Current auth phase</span> <strong class="svelte-1uha8ag">${escape_html(handoffLabel())}</strong> <p class="svelte-1uha8ag">${escape_html(data.authState.detail)}</p> `);
    if (data.authState.reasonCode) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code class="svelte-1uha8ag">${escape_html(data.authState.reasonCode)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> <div class="actions svelte-1uha8ag"><a class="button button-primary svelte-1uha8ag"${attr("href", buildDestination())}>${escape_html(data.authState.phase === "authenticated" ? "Open protected shell" : "Open sign-in")}</a> <a class="button button-secondary svelte-1uha8ag" href="/signin">View sign-in surface</a></div></section></main>`);
  });
}
export {
  _page as default
};
