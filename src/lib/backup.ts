import { useLog } from '../store/store';
import type { PlanOverride, Session, SessionExercise, SetEntry, Settings } from './types';

type Overrides = NonNullable<Settings['planOverrides']>;

/**
 * Kopia zapasowa do pliku JSON. Dane żyją w pamięci przeglądarki na telefonie —
 * wyczyszczenie danych Chrome albo zmiana telefonu to koniec historii, jeśli
 * nie ma kopii. Plik da się wysłać na Dysk Google albo do siebie na Messengerze.
 */

const FORMAT = 'trening-ab';

interface BackupFile {
  format: typeof FORMAT;
  version: 1;
  exportedAt: number;
  sessions: Session[];
  planOverrides?: Overrides;
}

export interface ParsedBackup {
  sessions: Session[];
  planOverrides: Overrides | null;
}

function backupFile(): File {
  const { sessions, settings } = useLog.getState();
  const data: BackupFile = {
    format: FORMAT,
    version: 1,
    exportedAt: Date.now(),
    sessions,
    planOverrides: settings.planOverrides ?? {},
  };
  const date = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(data, null, 1)], `plan-treningowy-kopia-${date}.json`, {
    type: 'application/json',
  });
}

export function canShareFiles(): boolean {
  try {
    const probe = new File(['{}'], 'test.json', { type: 'application/json' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Zapis pliku do folderu Pobrane. */
export function downloadBackup(): void {
  const file = backupFile();
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Systemowe „Udostępnij" z plikiem. Zwraca false, gdy użytkownik zrezygnował. */
export async function shareBackup(): Promise<boolean> {
  const file = backupFile();
  try {
    await navigator.share({ files: [file], title: 'Plan treningowy — kopia' });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (isNum(v) ? v : null);

function readSet(raw: unknown): SetEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string') return null;
  return {
    id: s.id,
    weight: numOrNull(s.weight),
    reps: numOrNull(s.reps),
    done: s.done === true,
    optional: s.optional === true,
    doneAt: numOrNull(s.doneAt),
  };
}

function readRange(raw: unknown): { min: number; max: number } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const min = isNum(r.min) ? r.min : 0;
  return { min, max: isNum(r.max) ? r.max : min };
}

function readExercise(raw: unknown): SessionExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.exerciseId !== 'string' || !Array.isArray(e.sets)) return null;
  const target = (e.target ?? {}) as Record<string, unknown>;
  return {
    exerciseId: e.exerciseId,
    target: {
      sets: readRange(target.sets),
      reps: readRange(target.reps),
      weight: numOrNull(target.weight),
    },
    sets: e.sets.map(readSet).filter((s): s is SetEntry => s !== null),
    variant: typeof e.variant === 'string' ? e.variant : null,
    note: typeof e.note === 'string' ? e.note : '',
  };
}

function readSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string' || (s.day !== 'A' && s.day !== 'B' && s.day !== 'C') || !isNum(s.startedAt)) {
    return null;
  }
  if (!Array.isArray(s.exercises)) return null;
  return {
    id: s.id,
    day: s.day,
    startedAt: s.startedAt,
    finishedAt: numOrNull(s.finishedAt) ?? s.startedAt,
    warmupDone: s.warmupDone === true,
    exercises: s.exercises.map(readExercise).filter((e): e is SessionExercise => e !== null),
    updatedAt: isNum(s.updatedAt) ? s.updatedAt : s.startedAt,
  };
}

function readOverrides(raw: unknown): Overrides | null {
  if (!raw || typeof raw !== 'object') return null;
  const result: Overrides = {};
  for (const day of ['A', 'B', 'C'] as const) {
    const forDay = (raw as Record<string, unknown>)[day];
    if (!forDay || typeof forDay !== 'object') continue;
    const clean: Record<string, PlanOverride> = {};
    for (const [id, value] of Object.entries(forDay as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      const sets = readRange(v.sets);
      const reps = readRange(v.reps);
      if (sets.min < 1 || reps.min < 1) continue;
      clean[id] = { sets, reps, weight: numOrNull(v.weight) };
    }
    if (Object.keys(clean).length) result[day] = clean;
  }
  return Object.keys(result).length ? result : null;
}

/** Sprawdza plik i zwraca treningi. Rzuca błąd z opisem, co jest nie tak. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('To nie jest plik kopii — nie da się go odczytać.');
  }
  const d = data as Partial<BackupFile> | null;
  if (!d || d.format !== FORMAT || !Array.isArray(d.sessions)) {
    throw new Error('Ten plik nie pochodzi z aplikacji Plan treningowy.');
  }
  return {
    sessions: d.sessions.map(readSession).filter((s): s is Session => s !== null),
    planOverrides: readOverrides(d.planOverrides),
  };
}
