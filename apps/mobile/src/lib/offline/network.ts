import { Network } from '@capacitor/network';

export type MobileNetworkStatus = {
  connected: boolean;
  source: 'capacitor-network' | 'navigator';
};

export type MobileNetworkListener = (status: MobileNetworkStatus) => void;

export type MobileNetworkPlugin = {
  getStatus: () => Promise<unknown>;
  addListener: (
    eventName: 'networkStatusChange',
    listener: (status: unknown) => void
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
};

export type MobileNetworkAdapter = {
  getCurrentStatus: () => Promise<MobileNetworkStatus>;
  subscribe: (listener: MobileNetworkListener) => Promise<() => Promise<void>>;
};

export function createMobileNetworkAdapter(options: {
  plugin?: MobileNetworkPlugin;
  browserOnline?: () => boolean;
} = {}): MobileNetworkAdapter {
  const plugin = options.plugin ?? (Network as MobileNetworkPlugin);
  const browserOnline = options.browserOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  return {
    async getCurrentStatus() {
      try {
        const raw = await plugin.getStatus();
        const connected = readConnectedFlag(raw);
        if (connected !== null) {
          return {
            connected,
            source: 'capacitor-network'
          } satisfies MobileNetworkStatus;
        }
      } catch {
        // Fall back to the last browser signal when Capacitor status is unavailable.
      }

      return {
        connected: browserOnline(),
        source: 'navigator'
      } satisfies MobileNetworkStatus;
    },

    async subscribe(listener) {
      const registration = await plugin.addListener('networkStatusChange', (raw) => {
        const connected = readConnectedFlag(raw);
        if (connected === null) {
          return;
        }

        listener({
          connected,
          source: 'capacitor-network'
        });
      });

      return async () => {
        await registration.remove();
      };
    }
  };
}

export function getMobileNetworkAdapter() {
  return createMobileNetworkAdapter();
}

function readConnectedFlag(value: unknown): boolean | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { connected?: unknown };
  return typeof candidate.connected === 'boolean' ? candidate.connected : null;
}
