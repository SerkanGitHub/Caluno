import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

type SupabaseStatusEnv = {
  API_URL?: string;
  ANON_KEY?: string;
  PUBLISHABLE_KEY?: string;
};

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, '..', '..');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175';

function parseStatusEnv(raw: string): SupabaseStatusEnv {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<SupabaseStatusEnv>((accumulator, line) => {
      const match = line.match(/^([A-Z0-9_]+)=(?:"([\s\S]*)"|(.*))$/);

      if (!match) {
        return accumulator;
      }

      const [, key, quotedValue, bareValue] = match;
      accumulator[key as keyof SupabaseStatusEnv] = (quotedValue ?? bareValue ?? '').trim();
      return accumulator;
    }, {});
}

function readLocalSupabasePublicEnv() {
  let raw = '';

  try {
    raw = execFileSync('supabase', ['status', '--output', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        'Unable to read local Supabase status for Playwright offline proof.',
        'Run `supabase db reset --local` before `pnpm -C apps/web exec playwright test -c playwright.offline.config.ts ...`.',
        `Original error: ${message}`
      ].join(' ')
    );
  }

  const env = parseStatusEnv(raw);
  const url = env.API_URL?.trim();
  const publishableKey = env.PUBLISHABLE_KEY?.trim() || env.ANON_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      'Local Supabase status did not expose API_URL and PUBLISHABLE_KEY/ANON_KEY for the Playwright offline proof web server.'
    );
  }

  return {
    PUBLIC_SUPABASE_URL: url,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    PUBLIC_SITE_URL: baseURL
  };
}

const publicEnv = readLocalSupabasePublicEnv();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [['list']],
  outputDir: 'test-results/e2e-offline',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000
  },
  webServer: {
    command: 'pnpm run build && pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ...publicEnv
    }
  }
});
