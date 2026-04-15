import { a as attr } from "../../chunks/attributes.js";
import { O as OFFLINE_RUNTIME_TEST_ID } from "../../chunks/runtime.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    let isolationState = "server";
    let serviceWorkerStatus = "unsupported";
    let serviceWorkerDetail = "ssr";
    $$renderer2.push(`<div${attr("data-testid", OFFLINE_RUNTIME_TEST_ID)}${attr("data-cross-origin-isolated", isolationState)}${attr("data-service-worker-status", serviceWorkerStatus)}${attr("data-service-worker-detail", serviceWorkerDetail)} data-offline-proof-surface="service-worker-preview">`);
    children($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _layout as default
};
