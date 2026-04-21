import { App } from '@capacitor/app';

export type MobileAppLifecycleEvent = 'resume' | 'pause';
export type MobileAppLifecycleListener = (event: MobileAppLifecycleEvent) => void;

export type MobileAppPlugin = {
  addListener: (
    eventName: 'appStateChange',
    listener: (state: unknown) => void
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
};

export type MobileAppLifecycleAdapter = {
  subscribe: (listener: MobileAppLifecycleListener) => Promise<() => Promise<void>>;
};

export function createMobileAppLifecycleAdapter(options: {
  plugin?: MobileAppPlugin;
} = {}): MobileAppLifecycleAdapter {
  const plugin = options.plugin ?? (App as MobileAppPlugin);

  return {
    async subscribe(listener) {
      const registration = await plugin.addListener('appStateChange', (raw) => {
        const nextEvent = readLifecycleEvent(raw);
        if (!nextEvent) {
          return;
        }

        listener(nextEvent);
      });

      return async () => {
        await registration.remove();
      };
    }
  };
}

export function getMobileAppLifecycleAdapter() {
  return createMobileAppLifecycleAdapter();
}

function readLifecycleEvent(value: unknown): MobileAppLifecycleEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { isActive?: unknown };
  if (typeof candidate.isActive !== 'boolean') {
    return null;
  }

  return candidate.isActive ? 'resume' : 'pause';
}
