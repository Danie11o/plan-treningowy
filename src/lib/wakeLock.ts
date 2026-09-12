import { useEffect } from 'react';

/**
 * Trzyma ekran zapalony w trakcie treningu.
 * Blokada przepada przy przełączeniu aplikacji, więc odnawiamy ją po powrocie.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Odmowa przeglądarki nie może zatrzymać treningu.
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Brak wibracji to nie błąd.
  }
}
