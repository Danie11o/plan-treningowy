import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_TRAINING_DAYS, planFor } from '../data/plan';
import { createSession, finalizeSession } from '../lib/session';
import type { DayKey, PlanOverride, Session, Settings } from '../lib/types';

/**
 * Dwa osobne zapisy w pamięci telefonu:
 * - historia (zakończone treningi + ustawienia) — zmienia się rzadko,
 * - trening w toku — zapisywany przy każdej wpisanej cyfrze, więc mały i szybki.
 *
 * Zapis jest natychmiastowy i synchroniczny: zamknięcie aplikacji w połowie
 * serii niczego nie gubi, po otwarciu trening czeka dokładnie tam, gdzie był.
 */

interface LogState {
  sessions: Session[];
  settings: Settings;
}

export const useLog = create<LogState>()(
  persist<LogState>(
    () => ({
      sessions: [],
      settings: { trainingDays: DEFAULT_TRAINING_DAYS, lastBackupAt: null, planOverrides: {} },
    }),
    { name: 'trening-ab:historia', version: 1 },
  ),
);

interface ActiveState {
  active: Session | null;
}

export const useActive = create<ActiveState>()(
  persist<ActiveState>(() => ({ active: null }), { name: 'trening-ab:w-toku', version: 1 }),
);

const byStart = (a: Session, b: Session) => a.startedAt - b.startedAt;

function upsert(list: Session[]) {
  useLog.setState((state) => {
    const map = new Map(state.sessions.map((s) => [s.id, s] as const));
    for (const s of list) map.set(s.id, s);
    return { sessions: [...map.values()].sort(byStart) };
  });
}

export function startWorkout(day: DayKey): Session {
  const session = createSession(day, planFor(day, useLog.getState().settings.planOverrides));
  useActive.setState({ active: session });
  return session;
}

export function updateActive(change: (session: Session) => Session): void {
  useActive.setState((state) => (state.active ? { active: change(state.active) } : state));
}

export function discardWorkout(): void {
  useActive.setState({ active: null });
}

export function finishWorkout(finishedAt: number): Session | null {
  const { active } = useActive.getState();
  if (!active) return null;
  const saved = finalizeSession(active, finishedAt);
  // Najpierw historia, potem czyszczenie — gdyby coś przerwało zapis w połowie,
  // trening zostaje w toku, a nie znika. Ten sam id nie zrobi duplikatu.
  upsert([saved]);
  useActive.setState({ active: null });
  return saved;
}

export function saveEditedSession(session: Session): void {
  upsert([finalizeSession(session, session.finishedAt ?? Date.now())]);
}

export function deleteSession(id: string): void {
  useLog.setState((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
}

export function setTrainingDays(days: number[]): void {
  useLog.setState((state) => ({
    settings: { ...state.settings, trainingDays: [...days].sort((a, b) => a - b) },
  }));
}

/** Zmiana ćwiczenia w planie; `null` przywraca wersję z pliku. */
export function setPlanOverride(day: DayKey, exerciseId: string, change: PlanOverride | null): void {
  useLog.setState((state) => {
    const all = { ...(state.settings.planOverrides ?? {}) };
    const forDay = { ...(all[day] ?? {}) };
    if (change) forDay[exerciseId] = change;
    else delete forDay[exerciseId];
    all[day] = forDay;
    return { settings: { ...state.settings, planOverrides: all } };
  });
}

/** Zmiany planu z kopii — lokalne mają pierwszeństwo, niczego nie nadpisujemy. */
export function mergePlanOverrides(incoming: NonNullable<Settings['planOverrides']>): void {
  useLog.setState((state) => {
    const current = state.settings.planOverrides ?? {};
    const next = { ...current };
    for (const day of ['A', 'B'] as const) {
      const extra = incoming[day];
      if (extra) next[day] = { ...extra, ...(current[day] ?? {}) };
    }
    return { settings: { ...state.settings, planOverrides: next } };
  });
}

export function markBackupDone(): void {
  useLog.setState((state) => ({ settings: { ...state.settings, lastBackupAt: Date.now() } }));
}

/** Wczytanie kopii niczego nie kasuje — dokłada brakujące treningi, nowsze wersje podmienia. */
export function mergeSessions(incoming: Session[]): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  useLog.setState((state) => {
    const map = new Map(state.sessions.map((s) => [s.id, s] as const));
    for (const s of incoming) {
      const existing = map.get(s.id);
      if (!existing) {
        map.set(s.id, s);
        added++;
      } else if (s.updatedAt > existing.updatedAt) {
        map.set(s.id, s);
        updated++;
      }
    }
    return { sessions: [...map.values()].sort(byStart) };
  });
  return { added, updated };
}
