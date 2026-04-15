<script lang="ts">
  import '../app.css';
  import { browser, dev } from '$app/environment';
  import { onMount } from 'svelte';
  import {
    OFFLINE_RUNTIME_TEST_ID,
    type OfflineIsolationState,
    type ServiceWorkerLifecycleState
  } from '$lib/offline/runtime';

  let { children } = $props();

  let isolationState = $state<OfflineIsolationState>(browser ? 'not-isolated' : 'server');
  let serviceWorkerStatus = $state<ServiceWorkerLifecycleState>(browser ? 'registering' : 'unsupported');
  let serviceWorkerDetail = $state('ssr');

  function setWorkerState(state: ServiceWorkerLifecycleState, detail: string) {
    serviceWorkerStatus = state;
    serviceWorkerDetail = detail;
  }

  function observeWorker(worker: ServiceWorker | null | undefined) {
    if (!worker) {
      return () => {};
    }

    const sync = () => {
      switch (worker.state) {
        case 'installing':
        case 'activating':
          setWorkerState('installing', worker.state);
          break;
        case 'installed':
          setWorkerState('installed', worker.state);
          break;
        case 'activated':
          setWorkerState('ready', worker.state);
          break;
        default:
          setWorkerState('error', worker.state);
      }
    };

    sync();
    worker.addEventListener('statechange', sync);

    return () => {
      worker.removeEventListener('statechange', sync);
    };
  }

  onMount(() => {
    if (!browser) {
      return;
    }

    isolationState = window.crossOriginIsolated ? 'isolated' : 'not-isolated';

    if (!('serviceWorker' in navigator)) {
      setWorkerState('unsupported', 'navigator.serviceWorker-unavailable');
      return;
    }

    let disposeWorkerListener = () => {};
    let cancelled = false;

    const syncControllerState = () => {
      if (navigator.serviceWorker.controller) {
        setWorkerState('ready', 'controller-present');
      }
    };

    const handleControllerChange = () => {
      if (!cancelled) {
        syncControllerState();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    void (async () => {
      setWorkerState('registering', 'registration-started');

      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          type: dev ? 'module' : 'classic'
        });

        disposeWorkerListener();
        disposeWorkerListener = observeWorker(
          registration.installing ?? registration.waiting ?? registration.active
        );

        syncControllerState();

        const readyRegistration = await navigator.serviceWorker.ready;
        if (cancelled) {
          return;
        }

        disposeWorkerListener();
        disposeWorkerListener = observeWorker(
          readyRegistration.installing ?? readyRegistration.waiting ?? readyRegistration.active
        );
        setWorkerState('ready', readyRegistration.active?.state ?? 'ready');
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : String(error);
          setWorkerState('error', detail.slice(0, 160));
        }
      }
    })();

    return () => {
      cancelled = true;
      disposeWorkerListener();
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  });
</script>

<div
  data-testid={OFFLINE_RUNTIME_TEST_ID}
  data-cross-origin-isolated={isolationState}
  data-service-worker-status={serviceWorkerStatus}
  data-service-worker-detail={serviceWorkerDetail}
  data-offline-proof-surface="service-worker-preview"
>
  {@render children()}
</div>
