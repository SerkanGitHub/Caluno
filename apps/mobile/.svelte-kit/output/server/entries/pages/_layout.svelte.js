import { o as onDestroy } from "../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import "@capacitor/local-notifications";
import "@capacitor/core";
import "@capacitor/push-notifications";
import "../../chunks/router.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    let removeLocalListener = null;
    let removePushListener = null;
    async function destroyNotificationListeners() {
      await Promise.allSettled([removeLocalListener?.(), removePushListener?.()]);
      removeLocalListener = null;
      removePushListener = null;
    }
    onDestroy(() => {
      void destroyNotificationListeners();
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
export {
  _layout as default
};
