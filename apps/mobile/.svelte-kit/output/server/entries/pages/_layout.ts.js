import "@sveltejs/kit";
import { g as getMobileSessionSnapshot } from "../../chunks/mobile-session.js";
const load = async ({ depends, route, url }) => {
  depends("mobile:auth");
  const authState = getMobileSessionSnapshot();
  const routeId = route.id ?? "";
  routeId.startsWith("/groups") || routeId.startsWith("/calendars");
  return {
    authState
  };
};
export {
  load
};
