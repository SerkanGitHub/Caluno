import { b as browser } from "../../../../../../chunks/false.js";
const load = async ({ data, parent }) => {
  const parentData = await parent();
  const isOnline = !browser;
  const findTimeBrowserState = isOnline ? {
    status: "trusted-online",
    reason: null,
    message: "This route is reading a fresh trusted server payload for the requested calendar and duration."
  } : {
    status: "offline-unavailable",
    reason: parentData.protectedShellState.mode === "offline-denied" ? parentData.protectedShellState.reason ?? "FIND_TIME_OFFLINE_UNAVAILABLE" : "FIND_TIME_OFFLINE_UNAVAILABLE",
    message: parentData.protectedShellState.mode === "offline-denied" ? "This browser is offline and the protected shell also lacks trusted continuity, so find-time stayed fail closed." : "This browser is offline, and find-time stays server-only instead of replaying cached calendar authority."
  };
  return {
    ...data,
    findTimeBrowserState
  };
};
export {
  load
};
