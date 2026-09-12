import { useSyncExternalStore } from 'react';

/**
 * Mały router na hashu (#/plan, #/historia/…).
 *
 * Hash, bo GitHub Pages nie umie przekierować nieznanych ścieżek na index.html.
 * Każdy wpis w historii dostaje numer — dzięki temu systemowy „wstecz" na
 * Androidzie cofa po ekranach aplikacji, a na ekranie głównym ją zamyka,
 * zamiast wyrzucać z niej w połowie treningu.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const scrollByEntry = new Map<number, number>();

/** Wpisy historii dodane pod otwarte arkusze — zawsze na samej górze stosu. */
let overlays: number[] = [];
let pendingLeave: (() => void) | null = null;

function readPath(): string {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

let path = readPath();
let entry: number = typeof history.state?.entry === 'number' ? history.state.entry : 0;

if (typeof history.state?.entry !== 'number') {
  history.replaceState({ entry }, '');
}
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function emit() {
  for (const l of listeners) l();
}

window.addEventListener('popstate', (event) => {
  entry = typeof event.state?.entry === 'number' ? event.state.entry : 0;
  overlays = overlays.filter((o) => o <= entry);
  if (pendingLeave && overlays.length === 0) {
    const done = pendingLeave;
    pendingLeave = null;
    // Po wszystkich innych nasłuchach — arkusze muszą zdążyć się zamknąć.
    window.setTimeout(done, 0);
  }

  const next = readPath();
  if (next === path) return;
  path = next;
  emit();
  const y = scrollByEntry.get(entry) ?? 0;
  // Dwie klatki — React musi najpierw wyrenderować poprzedni ekran.
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
});

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (to === path && !options.replace) return;
  scrollByEntry.set(entry, window.scrollY);
  if (options.replace) {
    overlays = overlays.filter((o) => o !== entry);
    history.replaceState({ entry }, '', `#${to}`);
  } else {
    entry += 1;
    history.pushState({ entry }, '', `#${to}`);
  }
  path = to;
  emit();
  window.scrollTo(0, 0);
}

/** Cofa o jeden ekran; jeśli aplikacja startowała od tego ekranu — idzie do `fallback`. */
export function goBack(fallback = '/'): void {
  if (entry > 0) history.back();
  else navigate(fallback, { replace: true });
}

/**
 * Wpis w historii pod otwarty arkusz — „wstecz" zamyka arkusz, a nie ekran.
 * Zwraca numer wpisu, żeby arkusz wiedział, czy to jego cofnięto.
 */
export function pushOverlayEntry(): number {
  entry += 1;
  overlays.push(entry);
  history.pushState({ entry, overlay: entry }, '');
  return entry;
}

/**
 * Zamyka wszystkie otwarte arkusze i czeka, aż historia wróci na ekran pod nimi.
 * Używane przed przejściem na inny ekran z wnętrza arkusza (zapis, usunięcie).
 */
export function leaveOverlays(): Promise<void> {
  const depth = overlays.length;
  if (!depth) return Promise.resolve();
  return new Promise((resolve) => {
    pendingLeave = resolve;
    history.go(-depth);
  });
}

export function currentEntry(): number {
  return entry;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => path);
}

/** matchRoute('/historia/:id', '/historia/abc') → { id: 'abc' } */
export function matchRoute(pattern: string, current: string): Record<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  const have = current.split('?')[0].split('/').filter(Boolean);
  if (want.length !== have.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = have[i];
    else if (want[i] !== have[i]) return null;
  }
  return params;
}
