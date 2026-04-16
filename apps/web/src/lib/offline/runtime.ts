export const WORKER_ISOLATION_HEADERS = Object.freeze({
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

export const OFFLINE_RUNTIME_TEST_ID = 'offline-runtime-surface';

export type OfflineIsolationState = 'isolated' | 'not-isolated' | 'server';

export type ServiceWorkerLifecycleState =
  | 'unsupported'
  | 'registering'
  | 'installing'
  | 'installed'
  | 'ready'
  | 'error';
