import { useEffect, useState } from 'react';

/** Bieżący czas, odświeżany co `interval` ms — do zegarów na ekranie. */
export function useNow(interval = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval, enabled]);
  return now;
}
