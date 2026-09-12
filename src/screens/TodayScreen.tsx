import { EXERCISES } from '../data/plan';
import { usePlan } from '../lib/plan';
import { startWorkout, useActive, useLog } from '../store/store';
import { otherDay, upcoming, weekCells, type WeekCell } from '../lib/schedule';
import { lastPerformance, sessionDuration, sessionTotals } from '../lib/stats';
import { setProgress } from '../lib/session';
import { navigate } from '../lib/router';
import { useNow } from '../lib/useNow';
import {
  DAY_NAMES,
  DAY_SHORT,
  formatClock,
  formatDuration,
  formatIn,
  formatLongDate,
} from '../lib/date';
import { fmtKg, fmtNum, fmtRange, plural } from '../lib/format';
import type { DayKey, Session } from '../lib/types';
import { Button, DayBadge, SectionTitle } from '../components/ui';
import { SessionRow } from '../components/SessionRow';
import { IconCheck, IconChevronRight, IconJump, IconPlay } from '../components/icons';

export function TodayScreen() {
  const sessions = useLog((s) => s.sessions);
  const trainingDays = useLog((s) => s.settings.trainingDays);
  const active = useActive((s) => s.active);
  const now = useNow(30_000);

  const today = new Date(now);
  const next = upcoming(today, trainingDays, sessions);
  const week = weekCells(today, trainingDays, sessions, active);
  const focusDay: DayKey = active?.day ?? next.day;
  const focusPlan = usePlan(focusDay);
  const lastSession = sessions[sessions.length - 1] ?? null;

  const start = (day: DayKey) => {
    if (!useActive.getState().active) startWorkout(day);
    navigate('/trening');
  };

  return (
    <div className="pt-safe">
      <header className="flex items-center justify-between px-4 pt-4 pb-4">
        <p className="label text-ash">{formatLongDate(today)}</p>
        <p className="label text-dim">Plan treningowy</p>
      </header>

      {active ? (
        <ActiveCard session={active} />
      ) : (
        <>
          {next.doneToday && <DoneTodayCard session={next.doneToday} />}
          <NextCard
            day={next.day}
            label={
              next.isToday
                ? 'Dziś'
                : `${next.doneToday ? 'Następny · ' : ''}${DAY_NAMES[next.date.getDay()]} · ${formatIn(next.date)}`
            }
            lastOfDay={[...sessions].reverse().find((s) => s.day === next.day) ?? null}
            onStart={() => start(next.day)}
            onStartOther={() => start(otherDay(next.day))}
          />
        </>
      )}

      <section className="mt-7 px-4" data-day={focusDay}>
        <SectionTitle aside="ostatni ciężar">Trening {focusDay} — plan</SectionTitle>
        <ol className="overflow-hidden rounded-card border border-edge bg-panel">
          {focusPlan.map((item, i) => {
            const exercise = EXERCISES[item.exerciseId];
            const last =
              exercise.kind === 'warmup' ? null : lastPerformance(sessions, item.exerciseId, focusDay);
            return (
              <li
                key={item.exerciseId}
                className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-edge' : ''}`}
              >
                <span className="num w-5 shrink-0 text-[16px] text-dim">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-chalk">
                    {exercise.name}
                  </span>
                  <span className="num mt-1 block text-[16px] text-day">
                    {exercise.kind === 'warmup'
                      ? `${fmtRange(item.reps.min, item.reps.max)} min`
                      : `${fmtRange(item.sets.min, item.sets.max)} × ${fmtRange(item.reps.min, item.reps.max)}`}
                    {exercise.perLeg && (
                      <span className="ml-1 font-sans text-[12px] font-normal text-ash">/ noga</span>
                    )}
                  </span>
                </span>
                {exercise.kind === 'jump' && (
                  <button
                    type="button"
                    onClick={() => navigate('/skoki')}
                    className="flex h-10 items-center gap-1.5 rounded-xl border border-edge px-2.5 text-[13px] text-ash active:bg-raised"
                  >
                    <IconJump className="size-[18px] text-day" />
                    warianty
                  </button>
                )}
                {exercise.kind !== 'warmup' && (
                  <span className="w-[72px] shrink-0 text-right">
                    {last?.top.weight ? (
                      <span className="num text-[20px] text-chalk">
                        {fmtNum(last.top.weight)}
                        <span className="ml-0.5 font-sans text-[12px] font-normal text-ash"> kg</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-dim">
                        {last ? 'bez ciężaru' : '—'}
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-7 px-4">
        <SectionTitle aside={trainingDaysLabel(trainingDays)}>Ten tydzień</SectionTitle>
        <div className="grid grid-cols-7 gap-1">
          {week.map((cell) => (
            <WeekDay key={cell.date.getTime()} cell={cell} />
          ))}
        </div>
      </section>

      {lastSession && (
        <section className="mt-7 px-4">
          <SectionTitle>Ostatni trening</SectionTitle>
          <SessionRow session={lastSession} />
        </section>
      )}
    </div>
  );
}

function trainingDaysLabel(days: number[]): string {
  if (!days.length) return 'bez stałych dni';
  const ordered = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const names = ordered.map((d) => DAY_NAMES[d]);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`;
}

/* ── Karta najbliższego treningu ───────────────────────────────────────── */

function NextCard({
  day,
  label,
  lastOfDay,
  onStart,
  onStartOther,
}: {
  day: DayKey;
  label: string;
  lastOfDay: Session | null;
  onStart: () => void;
  onStartOther: () => void;
}) {
  const plan = usePlan(day);
  const items = plan.filter((i) => EXERCISES[i.exerciseId].kind !== 'warmup');
  const setsMin = items.reduce((sum, i) => sum + i.sets.min, 0);
  const setsMax = items.reduce((sum, i) => sum + i.sets.max, 0);
  const other = otherDay(day);

  return (
    <section data-day={day} className="px-4">
      <div className="relative overflow-hidden rounded-[26px] border border-edge bg-panel">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-day/20 blur-3xl"
        />
        <div className="relative flex items-end gap-5 px-5 pt-5">
          {/* Litera jak numer na koszulce — z drugiego końca sali wiesz, co dziś robisz. */}
          <span className="display -mb-1 text-[132px] leading-[0.74] text-day">{day}</span>
          <div className="min-w-0 flex-1 pb-1">
            <p className="label text-day">{label}</p>
            <p className="display mt-1.5 text-[32px] uppercase">Trening {day}</p>
            <p className="mt-2 text-[14px] leading-snug text-ash">
              {items.length} {plural(items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} ·{' '}
              {fmtRange(setsMin, setsMax)} serii
              {lastOfDay && (
                <>
                  <br />
                  ostatnio {formatDuration(sessionDuration(lastOfDay), false)}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="relative px-5 pt-5 pb-4">
          <Button variant="day" size="lg" full onClick={onStart}>
            <IconPlay className="size-5" />
            Zacznij trening {day}
          </Button>
          <button
            type="button"
            onClick={onStartOther}
            data-day={other}
            className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 text-[14px] text-ash active:text-chalk"
          >
            Dziś wolisz inaczej?
            <span className="font-medium text-day">Zacznij trening {other}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Trening w toku ────────────────────────────────────────────────────── */

function ActiveCard({ session }: { session: Session }) {
  const now = useNow(1000);
  const { done, planned } = setProgress(session);
  return (
    <section data-day={session.day} className="px-4">
      <button
        type="button"
        onClick={() => navigate('/trening')}
        className="relative w-full overflow-hidden rounded-[26px] border border-day/50 bg-panel p-5 text-left"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-day/20 blur-3xl"
        />
        <p className="label relative flex items-center gap-2 text-day">
          <span className="size-2 animate-pulse rounded-full bg-day" />
          Trening w toku
        </p>
        <div className="relative mt-3 flex items-end justify-between gap-3">
          <p className="display text-[36px] uppercase">Trening {session.day}</p>
          <p className="num text-[36px] text-day">{formatClock(now - session.startedAt)}</p>
        </div>
        <p className="relative mt-1 text-[14px] text-ash">
          {done} z {planned} serii zrobione
        </p>
        <span className="relative mt-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-day text-[16px] font-semibold text-day-ink">
          Wróć do treningu
          <IconChevronRight className="size-5" />
        </span>
      </button>
    </section>
  );
}

function DoneTodayCard({ session }: { session: Session }) {
  const totals = sessionTotals(session);
  return (
    <section className="mb-3 px-4">
      <button
        type="button"
        onClick={() => navigate(`/historia/${session.id}`)}
        className="flex w-full items-center gap-3 rounded-card border border-go/35 bg-go/8 p-4 text-left active:bg-go/12"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-go text-[#03220f]">
          <IconCheck className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-chalk">
            Dzisiejszy trening {session.day} zapisany
          </span>
          <span className="block text-[13px] text-ash">
            {formatDuration(sessionDuration(session), false)} · {fmtKg(totals.kg)}
          </span>
        </span>
        <IconChevronRight className="size-5 text-dim" />
      </button>
    </section>
  );
}

/* ── Tydzień ───────────────────────────────────────────────────────────── */

function WeekDay({ cell }: { cell: WeekCell }) {
  const doneDay = cell.done[cell.done.length - 1]?.day ?? null;
  const past = !cell.isToday && cell.date.getTime() < Date.now();

  let marker = <span className="size-7" />;
  if (doneDay) {
    marker = (
      <span data-day={doneDay} className="relative">
        <DayBadge day={doneDay} size="sm" />
        <span className="absolute -right-1.5 -bottom-1.5 grid size-4 place-items-center rounded-full bg-go text-[#03220f] ring-2 ring-night">
          <IconCheck className="size-2.5" strokeWidth={3.5} />
        </span>
      </span>
    );
  } else if (cell.inProgress) {
    marker = (
      <span data-day={cell.inProgress} className="animate-pulse">
        <DayBadge day={cell.inProgress} size="sm" />
      </span>
    );
  } else if (cell.planned) {
    marker = (
      <span
        data-day={cell.planned}
        className="display grid size-7 place-items-center rounded-lg border-2 border-day pt-[0.06em] text-[15px] text-day"
      >
        {cell.planned}
      </span>
    );
  } else if (cell.training && past) {
    marker = <span className="size-7 rounded-lg border border-dashed border-edge" title="Bez treningu" />;
  }

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 ${
        cell.isToday ? 'bg-panel ring-1 ring-edge' : ''
      }`}
    >
      <span className={`label text-[10px] ${cell.isToday ? 'text-chalk' : 'text-dim'}`}>
        {DAY_SHORT[cell.date.getDay()]}
      </span>
      <span className={`num text-[17px] ${cell.isToday ? 'text-chalk' : 'text-ash'}`}>
        {cell.date.getDate()}
      </span>
      {marker}
    </div>
  );
}

