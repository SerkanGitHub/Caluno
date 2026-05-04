import { a as readonly, w as writable } from "./index.js";
import "@capacitor/preferences";
import "./repository.js";
import "@supabase/ssr";
const trustedCalendarScopeStore = writable(null);
const notificationRouteDiagnosticsStore = writable(createIdleNotificationRouteDiagnostics());
readonly(trustedCalendarScopeStore);
const notificationRouteDiagnostics = readonly(notificationRouteDiagnosticsStore);
function createIdleNotificationRouteDiagnostics() {
  return {
    code: "idle",
    source: null,
    targetPath: null,
    normalizedPath: null,
    requestedCalendarId: null,
    reason: null,
    detail: "No notification tap has been routed in this session yet.",
    handledAt: null
  };
}
function clearTrustedNotificationCalendarScope() {
  trustedCalendarScopeStore.set(null);
}
export {
  clearTrustedNotificationCalendarScope as c,
  notificationRouteDiagnostics as n
};
