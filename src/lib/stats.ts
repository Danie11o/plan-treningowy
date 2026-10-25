import { EXERCISES, SAME_DAY_HISTORY } from '../data/plan';
import type { DayKey, Session, SessionExercise, SetEntry } from './types';

/**
 * Wszystkie liczby aplikacji: sumy, rekordy, „ostatnio".
 * Liczone na bieżąco z historii — przy dwóch treningach w tygodniu to kilkaset
 * serii rocznie, więc nie ma czego trzymać w osobnych tabelach.
 */

export function counts(set: SetEntry): boolean {
  return set.done && set.reps !== null && set.reps > 0;
}

/** Ćwiczenia na nogę lub stronę liczą się dla obu stron, czyli ×2. */
function legs(exerciseId: string): number {
  const info = EXERCISES[exerciseId];
  return info?.perLeg || info?.perSide ? 2 : 1;
}

export function setKg(set: SetEntry, exerciseId: string): number {
  if (!counts(set) || !set.weight) return 0;
  return set.weight * (set.reps as number) * legs(exerciseId);
}

export function setReps(set: SetEntry, exerciseId: string): number {
  return counts(set) ? (set.reps as number) * legs(exerciseId) : 0;
}

export interface Totals {
  kg: number;
  reps: number;
  sets: number;
}

export function exerciseTotals(exercise: SessionExercise): Totals {
  const totals: Totals = { kg: 0, reps: 0, sets: 0 };
  for (const s of exercise.sets) {
    if (!counts(s)) continue;
    totals.kg += setKg(s, exercise.exerciseId);
    totals.reps += setReps(s, exercise.exerciseId);
    totals.sets += 1;
  }
  return totals;
}

export function sessionTotals(session: Session): Totals {
  const totals: Totals = { kg: 0, reps: 0, sets: 0 };
  for (const e of session.exercises) {
    const t = exerciseTotals(e);
    totals.kg += t.kg;
    totals.reps += t.reps;
    totals.sets += t.sets;
  }
  return totals;
}

export function sessionDuration(session: Session): number {
  return (session.finishedAt ?? Date.now()) - session.startedAt;
}

/** Najcięższa seria; przy równym ciężarze wygrywa więcej powtórzeń. */
export function bestSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sets) {
    if (!counts(s)) continue;
    if (!best || beats(s.weight ?? 0, s.reps as number, best.weight ?? 0, best.reps as number)) {
      best = s;
    }
  }
  return best;
}

function beats(weight: number, reps: number, bestWeight: number, bestReps: number): boolean {
  return weight > bestWeight || (weight === bestWeight && reps > bestReps);
}

/** Czy seria jest lepsza od wzorca (rekordu albo innej serii). */
export function isBetter(
  weight: number,
  reps: number,
  than: { weight: number | null; reps: number | null } | null,
): boolean {
  if (!than) return true;
  return beats(weight, reps, than.weight ?? 0, than.reps ?? 0);
}

export interface RecordHit {
  sessionId: string;
  date: number;
  day: DayKey;
  weight: number;
  reps: number;
}

/**
 * Wszystkie rekordy od początku: każdy trening, na którym padł nowy najlepszy
 * ciężar. Z jednego treningu wchodzi najlepsza seria, nie każda po kolei.
 * Sesje muszą być posortowane od najstarszej.
 */
export function recordTimeline(sessions: Session[], exerciseId: string): RecordHit[] {
  const hits: RecordHit[] = [];
  let best: RecordHit | null = null;
  for (const session of sessions) {
    for (const e of session.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) {
        if (!counts(s) || !s.weight) continue;
        if (best && !beats(s.weight, s.reps as number, best.weight, best.reps)) continue;
        best = {
          sessionId: session.id,
          date: session.startedAt,
          day: session.day,
          weight: s.weight,
          reps: s.reps as number,
        };
        const last = hits[hits.length - 1];
        if (last && last.sessionId === session.id) hits[hits.length - 1] = best;
        else hits.push(best);
      }
    }
  }
  return hits;
}

export function currentRecord(sessions: Session[], exerciseId: string): RecordHit | null {
  const timeline = recordTimeline(sessions, exerciseId);
  return timeline[timeline.length - 1] ?? null;
}

export interface LastPerformance {
  session: Session;
  exercise: SessionExercise;
  top: SetEntry;
  /** false, gdy podpowiedź pochodzi z drugiego dnia (np. pierwszy raz na B). */
  sameDay: boolean;
}

/** Ostatni raz, kiedy to ćwiczenie było zrobione. Sesje od najstarszej. */
export function lastPerformance(
  sessions: Session[],
  exerciseId: string,
  day: DayKey,
): LastPerformance | null {
  const pick = (accept: (s: Session) => boolean): LastPerformance | null => {
    for (let i = sessions.length - 1; i >= 0; i--) {
      const session = sessions[i];
      if (!accept(session)) continue;
      const exercise = session.exercises.find(
        (e) => e.exerciseId === exerciseId && e.sets.some(counts),
      );
      const top = exercise ? bestSet(exercise.sets) : null;
      if (exercise && top) return { session, exercise, top, sameDay: session.day === day };
    }
    return null;
  };
  if (SAME_DAY_HISTORY.has(exerciseId)) {
    const sameDay = pick((s) => s.day === day);
    if (sameDay) return sameDay;
  }
  return pick(() => true);
}

/** Podpowiedź do pola: ta sama seria z poprzedniego razu, a jak jej nie było — ostatnia. */
export function suggestion(
  last: LastPerformance | null,
  setIndex: number,
  fallbackReps: number,
): { weight: number | null; reps: number } {
  if (!last) return { weight: null, reps: fallbackReps };
  const done = last.exercise.sets.filter(counts);
  const match = done[setIndex] ?? done[done.length - 1];
  return { weight: match?.weight ?? null, reps: match?.reps ?? fallbackReps };
}

export interface Lifetime {
  sessions: number;
  a: number;
  b: number;
  c: number;
  kg: number;
  reps: number;
  sets: number;
  ms: number;
  first: number | null;
}

export function lifetime(sessions: Session[]): Lifetime {
  const result: Lifetime = { sessions: 0, a: 0, b: 0, c: 0, kg: 0, reps: 0, sets: 0, ms: 0, first: null };
  for (const s of sessions) {
    const t = sessionTotals(s);
    result.sessions += 1;
    if (s.day === 'A') result.a += 1;
    else if (s.day === 'B') result.b += 1;
    else result.c += 1;
    result.kg += t.kg;
    result.reps += t.reps;
    result.sets += t.sets;
    result.ms += sessionDuration(s);
    if (result.first === null || s.startedAt < result.first) result.first = s.startedAt;
  }
  return result;
}

export interface BrokenRecord {
  exerciseId: string;
  weight: number;
  reps: number;
  previous: RecordHit;
}

/** Rekordy pobite na tym treningu — względem wszystkiego, co było przed nim. */
export function recordsBroken(session: Session, allSessions: Session[]): BrokenRecord[] {
  const before = allSessions.filter((s) => s.id !== session.id && s.startedAt < session.startedAt);
  const broken: BrokenRecord[] = [];
  for (const e of session.exercises) {
    const top = bestSet(e.sets);
    if (!top?.weight) continue;
    const previous = currentRecord(before, e.exerciseId);
    if (previous && beats(top.weight, top.reps as number, previous.weight, previous.reps)) {
      broken.push({ exerciseId: e.exerciseId, weight: top.weight, reps: top.reps as number, previous });
    }
  }
  return broken;
}

/** Poprzedni trening tego samego typu — do porównania w podsumowaniu. */
export function previousOfDay(session: Session, allSessions: Session[]): Session | null {
  for (let i = allSessions.length - 1; i >= 0; i--) {
    const s = allSessions[i];
    if (s.id !== session.id && s.day === session.day && s.startedAt < session.startedAt) return s;
  }
  return null;
}
