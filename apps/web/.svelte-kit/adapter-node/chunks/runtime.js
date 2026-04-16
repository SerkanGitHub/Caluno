const WORKER_ISOLATION_HEADERS = Object.freeze({
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
});
const OFFLINE_RUNTIME_TEST_ID = "offline-runtime-surface";
export {
  OFFLINE_RUNTIME_TEST_ID as O,
  WORKER_ISOLATION_HEADERS as W
};
