<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { getMobileLocalNotificationsAdapter } from '$lib/notifications/local-notifications';
  import { getMobilePushNotificationsAdapter } from '$lib/notifications/push-notifications';
  import { routeNotificationOpen } from '$lib/notifications/router';

  let { children } = $props();

  let removeLocalListener: (() => Promise<void>) | null = null;
  let removePushListener: (() => Promise<void>) | null = null;

  async function destroyNotificationListeners() {
    await Promise.allSettled([removeLocalListener?.(), removePushListener?.()]);
    removeLocalListener = null;
    removePushListener = null;
  }

  async function handleNotificationRoute(source: 'local' | 'push', targetPath: string | null) {
    await routeNotificationOpen({
      source,
      targetPath,
      navigate: (path) => goto(path)
    });
  }

  $effect(() => {
    if (!browser) {
      return;
    }

    let disposed = false;

    void (async () => {
      const localAdapter = getMobileLocalNotificationsAdapter();
      const pushAdapter = getMobilePushNotificationsAdapter();

      try {
        const removeLocal = await localAdapter.subscribeToActions((action) => {
          void handleNotificationRoute('local', action.targetPath);
        });

        if (disposed) {
          await removeLocal();
        } else {
          removeLocalListener = removeLocal;
        }
      } catch {
        removeLocalListener = null;
      }

      try {
        const removePush = await pushAdapter.subscribeToActions((action) => {
          void handleNotificationRoute('push', action.targetPath);
        });

        if (disposed) {
          await removePush();
        } else {
          removePushListener = removePush;
        }
      } catch {
        removePushListener = null;
      }
    })();

    return () => {
      disposed = true;
      void destroyNotificationListeners();
    };
  });

  onDestroy(() => {
    void destroyNotificationListeners();
  });
</script>

{@render children()}
