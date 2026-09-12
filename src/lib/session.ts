import { EXERCISES } from '../data/plan';
import { uid } from './id';
import type { DayKey, PlanItem, Session, SessionExercise, SetEntry } from './types';

/**
 * Operacje na jednym treningu. Wszystkie są czyste — biorą trening i zwracają
 * nowy — więc ten sam ekran obsługuje trening w toku i poprawianie historii.
 */

function newSet(optional: boolean): SetEntry {
  return { id: uid(), weight: null, reps: null, done: false, optional, doneAt: null };
}

export function createSession(day: DayKey, plan: PlanItem[]): Session {
  const now = Date.now();
  return {
    id: uid(),
    day,
    startedAt: now,
    finishedAt: null,
    warmupDone: false,
    updatedAt: now,
    exercises: plan
      .filter((item) => EXERCISES[item.exerciseId].kind !== 'warmup')
      .map((item) => ({
        exerciseId: item.exerciseId,
        target: { sets: { ...item.sets }, reps: { ...item.reps }, weight: item.weight ?? null },
        // Przy „2–3 serie" trzecia jest opcjonalna — widać ją, ale nie liczy się do planu.
        sets: Array.from({ length: item.sets.max }, (_, i) => newSet(i >= item.sets.min)),
        variant: null,
        note: '',
      })),
  };
}

function withExercises(session: Session, exercises: SessionExercise[]): Session {
  return { ...session, exercises, updatedAt: Date.now() };
}

export function patchExercise(
  session: Session,
  index: number,
  patch: Partial<SessionExercise>,
): Session {
  return withExercises(
    session,
    session.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
  );
}

export function patchSet(
  session: Session,
  index: number,
  setId: string,
  patch: Partial<SetEntry>,
): Session {
  return withExercises(
    session,
    session.exercises.map((e, i) =>
      i === index ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : e,
    ),
  );
}

export function addSet(session: Session, index: number): Session {
  return withExercises(
    session,
    session.exercises.map((e, i) => (i === index ? { ...e, sets: [...e.sets, newSet(false)] } : e)),
  );
}

export function removeSet(session: Session, index: number, setId: string): Session {
  return withExercises(
    session,
    session.exercises.map((e, i) =>
      i === index ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
    ),
  );
}

/** Do historii trafia tylko to, co faktycznie zrobione i odhaczone. */
export function finalizeSession(session: Session, finishedAt: number): Session {
  return {
    ...session,
    finishedAt,
    updatedAt: Date.now(),
    exercises: session.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && s.reps !== null && s.reps > 0) }))
      .filter((e) => e.sets.length > 0),
  };
}

export function lastDoneAt(session: Session): number | null {
  let last: number | null = null;
  for (const e of session.exercises) {
    for (const s of e.sets) {
      if (s.done && s.doneAt !== null && (last === null || s.doneAt > last)) last = s.doneAt;
    }
  }
  return last;
}

/** Serie odhaczone i serie z planu (bez opcjonalnych, chyba że już zrobione). */
export function setProgress(session: Session): { done: number; planned: number } {
  let done = 0;
  let planned = 0;
  for (const e of session.exercises) {
    for (const s of e.sets) {
      if (s.done) done++;
      if (!s.optional || s.done) planned++;
    }
  }
  return { done, planned };
}

/** Serie z wpisanymi liczbami, których nikt nie odhaczył — przed zapisem trzeba o nie zapytać. */
export function filledButOpen(session: Session): number {
  let count = 0;
  for (const e of session.exercises) {
    for (const s of e.sets) {
      if (!s.done && (s.weight !== null || s.reps !== null)) count++;
    }
  }
  return count;
}
