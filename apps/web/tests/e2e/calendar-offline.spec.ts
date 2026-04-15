import { expect, test } from './fixtures';

test('preview proof surface exposes isolation headers and a live service worker before offline route work begins', async ({
  page,
  flow
}) => {
  await test.step('phase: open the signed-out entrypoint through the preview-backed surface', async () => {
    flow.mark('preview-shell', '/signin');

    const response = await page.goto('/signin');
    expect(response).not.toBeNull();
    expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin');
    expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
    await expect(page.getByTestId('signed-out-entrypoint')).toBeVisible();
  });

  await test.step('phase: expose the runtime inspection surface for isolation and service worker state', async () => {
    const runtimeSurface = page.getByTestId('offline-runtime-surface');

    await expect(runtimeSurface).toBeVisible();
    await expect(runtimeSurface).toHaveAttribute('data-offline-proof-surface', 'service-worker-preview');
    await expect(runtimeSurface).toHaveAttribute('data-cross-origin-isolated', 'isolated');

    await expect
      .poll(
        async () => runtimeSurface.getAttribute('data-service-worker-status'),
        {
          timeout: 15_000,
          message: 'expected the service worker registration to reach an installable or ready state'
        }
      )
      .toMatch(/installed|ready/);
  });
});
