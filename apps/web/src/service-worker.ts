/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { base, build, files, version } from '$service-worker';

const self = globalThis as unknown as ServiceWorkerGlobalScope;
const SHELL_CACHE = `caluno-shell-${version}`;
const NAVIGATION_CACHE = `caluno-pages-${version}`;
const CACHE_PREFIXES = ['caluno-shell-', 'caluno-pages-'];
const APP_SHELL_ASSETS = [...new Set([...build, ...files])];
const PUBLIC_ROUTE_PATTERNS = [/^\/$/, /^\/signin\/?$/];
const PROTECTED_ROUTE_PATTERNS = [
  /^\/groups\/?$/,
  /^\/calendars\/[0-9a-f-]+\/find-time\/?$/i,
  /^\/calendars\/[0-9a-f-]+\/?$/i
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(APP_SHELL_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && key !== SHELL_CACHE && key !== NAVIGATION_CACHE) {
          await caches.delete(key);
        }
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (APP_SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(respondWithShellAsset(url.pathname));
    return;
  }

  if (event.request.mode === 'navigate' && isCacheableNavigationPath(url.pathname)) {
    event.respondWith(respondWithVisitedNavigation(event.request));
  }
});

async function respondWithShellAsset(pathname: string) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(pathname);

  if (cached) {
    return cached;
  }

  const response = await fetch(pathname);
  if (!(response instanceof Response)) {
    throw new Error('service-worker-shell-fetch-invalid');
  }

  if (response.ok) {
    await cache.put(pathname, response.clone());
  }

  return response;
}

async function respondWithVisitedNavigation(request: Request) {
  const cache = await caches.open(NAVIGATION_CACHE);

  try {
    const response = await fetch(request);
    if (!(response instanceof Response)) {
      throw new Error('service-worker-navigation-fetch-invalid');
    }

    if (isCacheableNavigationResponse(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    throw error;
  }
}

function isCacheableNavigationResponse(response: Response) {
  return response.ok && response.type === 'basic' && response.headers.get('content-type')?.includes('text/html');
}

function isCacheableNavigationPath(pathname: string) {
  const normalizedPath = stripBase(pathname);
  return [...PUBLIC_ROUTE_PATTERNS, ...PROTECTED_ROUTE_PATTERNS].some((pattern) => pattern.test(normalizedPath));
}

function stripBase(pathname: string) {
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }

  return pathname;
}
