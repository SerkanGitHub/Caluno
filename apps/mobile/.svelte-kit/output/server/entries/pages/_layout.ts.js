import "@sveltejs/kit";
import { g as getMobileSessionSnapshot } from "../../chunks/mobile-session.js";
import { r as resolveMobileProtectedEntryState } from "../../chunks/load-app-shell.js";
const load = async ({ depends, route, url }) => {
  depends("mobile:auth");
  const authState = getMobileSessionSnapshot();
  const protectedEntry = await resolveMobileProtectedEntryState({
    pathname: url.pathname,
    search: url.search,
    authPhase: authState.phase,
    authReasonCode: authState.reasonCode,
    now: /* @__PURE__ */ new Date()
  });
  route.id ?? "";
  return {
    authState,
    protectedEntry
  };
};
export {
  load
};
