/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WORKER_ISOLATION_HEADERS } from './src/lib/offline/runtime';

function isolationHeadersPlugin() {
  const applyHeaders = (
    response: {
      setHeader(name: string, value: string): void;
      getHeader?(name: string): string | number | string[] | undefined;
    } | null | undefined
  ) => {
    if (!response) {
      return;
    }

    for (const [headerName, headerValue] of Object.entries(WORKER_ISOLATION_HEADERS)) {
      if (typeof response.getHeader === 'function' && response.getHeader(headerName)) {
        continue;
      }
      response.setHeader(headerName, headerValue);
    }
  };

  return {
    name: 'caluno-worker-isolation-headers',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((_request: IncomingMessage, response: ServerResponse, next: () => void) => {
        applyHeaders(response);
        next();
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((_request: IncomingMessage, response: ServerResponse, next: () => void) => {
        applyHeaders(response);
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [sveltekit(), isolationHeadersPlugin()],
  server: {
    headers: WORKER_ISOLATION_HEADERS
  },
  preview: {
    headers: WORKER_ISOLATION_HEADERS
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm']
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: false
  }
});
