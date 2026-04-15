/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { WORKER_ISOLATION_HEADERS } from './src/lib/offline/runtime';

export default defineConfig({
  plugins: [sveltekit()],
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
