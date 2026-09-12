import { addDays, isSameDay, startOfDay } from './date';
import type { DayKey, Session } from './types';

/**
 * A i B idą na zmianę, niezależnie od dnia tygodnia. Przy czwartku i sobocie
 * wychodzi czwartek A, sobota B — a jak jeden trening wypadnie, kolejny i tak
 * będzie tym, którego zabrakło, więc oba wypadają po tyle samo razy.
 */

export function otherDay(day: DayKey): DayKey {
  return day === 'A' ? 'B' : 'A';
}

export function nextDay(sessions: Session[], active: Session | null = null): DayKey {
  if (active) return otherDay(active.day);
  const last = sessions[sessions.length - 1];
  return last ? otherDay(last.day) : 'A';
}

export interface Upcoming {
  date: Date;
  day: DayKey;
  isToday: boolean;
  doneToday: Session | null;
}

export function upcoming(now: Date, trainingDays: number[], sessions: Session[]): Upcoming {
  let doneToday: Session | null = null;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (isSameDay(sessions[i].startedAt, now)) {
      doneToday = sessions[i];
      break;
    }
  }
  const from = doneToday ? addDays(startOfDay(now), 1) : startOfDay(now);
  let date = from;
  if (trainingDays.length) {
    for (let i = 0; i < 7; i++) {
      const candidate = addDays(from, i);
      if (trainingDays.includes(candidate.getDay())) {
        date = candidate;
        break;
      }
    }
  }
  return { date, day: nextDay(sessions), isToday: isSameDay(date, now), doneToday };
}

export interface WeekCell {
  date: Date;
  isToday: boolean;
  training: boolean;
  done: Session[];
  inProgress: DayKey | null;
  /** Litera, która wypadnie tego dnia, jeśli trening dopiero przed nami. */
  planned: DayKey | null;
}

export function weekCells(
  now: Date,
  trainingDays: number[],
  sessions: Session[],
  active: Session | null,
): WeekCell[] {
  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const first = upcoming(now, trainingDays, sessions).date;
  let next = nextDay(sessions, active);

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const done = sessions.filter((s) => isSameDay(s.startedAt, date));
    const training = trainingDays.includes(date.getDay());
    const inProgress = active && isSameDay(active.startedAt, date) ? active.day : null;
    let planned: DayKey | null = null;
    if (training && !done.length && !inProgress && date >= first) {
      planned = next;
      next = otherDay(next);
    }
    return { date, isToday: isSameDay(date, now), training, done, inProgress, planned };
  });
}
