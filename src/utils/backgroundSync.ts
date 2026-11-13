/**
 * PWA Background Sync Utility
 *
 * Provides background synchronization registration for offline actions (e.g., library sync, reading progress).
 * Uses the ServiceWorkerRegistration Background Sync API ('sync' in registration) when available,
 * and gracefully falls back to the browser's 'online' event listener.
 */

/**
 * Checks whether the Background Sync API is supported in the current browser/environment.
 */
export function isBackgroundSyncSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  );
}

/**
 * Registers a one-off background sync event with the active service worker.
 * Returns true if background sync was successfully registered, or false if unsupported or failed.
 */
export async function registerBackgroundSync(tag: string = 'sync-library'): Promise<boolean> {
  if (!isBackgroundSyncSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && 'sync' in registration) {
      const syncReg = registration as unknown as { sync: { register: (tag: string) => Promise<void> } };
      await syncReg.sync.register(tag);
      return true;
    }
  } catch {
    // Permission denied or SW not ready; graceful fallback
  }
  return false;
}

/**
 * Sets up an online listener that triggers a callback when connectivity is restored,
 * as a universal fallback for browsers that do not support the Background Sync API.
 */
export function onConnectivityRestored(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    callback();
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
