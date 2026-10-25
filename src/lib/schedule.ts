import { addDays, isSameDay, startOfDay } from './date';
import type { DayKey, ScheduledDay, Session } from './types';

/**
 * A i B idą na zmianę, niezależnie od dnia tygodnia. Przy czwartku i sobocie
 * wychodzi czwartek A, sobota B — a jak jeden trening wypadnie, kolejny i tak
 * będzie tym, którego zabrakło, więc oba wypadają po tyle samo razy.
 */

export function otherDay(day: ScheduledDay): ScheduledDay {
  return day === 'A' ? 'B' : 'A';
}

export function nextDay(sessions: Session[], active: Session | null = null): ScheduledDay {
  if (active && active.day !== 'C') return otherDay(active.day);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const day = sessions[i].day;
    if (day !== 'C') return otherDay(day);
  }
  return 'A';
}

export interface Upcoming {
  date: Date;
  day: ScheduledDay;
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
  // Extra nie zalicza dzisiejszego A/B ani nie przesuwa jego terminu.
  const scheduledDoneToday = sessions.some((s) => s.day !== 'C' && isSameDay(s.startedAt, now));
  const from = scheduledDoneToday ? addDays(startOfDay(now), 1) : startOfDay(now);
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
  planned: ScheduledDay | null;
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
    let planned: ScheduledDay | null = null;
    const scheduledDone = done.some((s) => s.day !== 'C');
    const scheduledInProgress = inProgress !== null && inProgress !== 'C';
    if (training && !scheduledDone && !scheduledInProgress && date >= first) {
      planned = next;
      next = otherDay(next);
    }
    return { date, isToday: isSameDay(date, now), training, done, inProgress, planned };
  });
}
