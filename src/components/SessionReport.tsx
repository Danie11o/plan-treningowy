import { EXERCISES } from '../data/plan';
import { JUMPS_BY_ID } from '../data/jumps';
import {
  bestSet,
  counts,
  exerciseTotals,
  previousOfDay,
  recordsBroken,
  sessionDuration,
  sessionTotals,
} from '../lib/stats';
import { formatDuration, formatShortDate } from '../lib/date';
import { fmtNum, fmtSet } from '../lib/format';
import type { Session, SessionExercise } from '../lib/types';
import { IconTrophy } from './icons';

/** Wszystko o jednym treningu — w podsumowaniu i w historii. */
export function SessionReport({ session, all }: { session: Session; all: Session[] }) {
  const totals = sessionTotals(session);
  const duration = sessionDuration(session);
  const broken = recordsBroken(session, all);
  const previous = previousOfDay(session, all);
  const previousTotals = previous ? sessionTotals(previous) : null;
  const brokenIds = new Set(broken.map((b) => b.exerciseId));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Czas treningu" value={formatDuration(duration)} wide />
        <StatTile label="Podniesiony ciężar" value={fmtNum(totals.kg)} unit="kg" wide accent />
        <StatTile label="Serie" value={String(totals.sets)} />
        <StatTile label="Powtórzenia" value={fmtNum(totals.reps)} />
      </div>

      {broken.length > 0 && (
        <div className="rounded-card border border-gold/35 bg-gold/[0.07] p-4">
          <p className="label flex items-center gap-1.5 text-gold">
            <IconTrophy className="size-4" />
            {broken.length === 1 ? 'Nowy rekord' : `Nowe rekordy: ${broken.length}`}
          </p>
          <ul className="mt-3 space-y-3">
            {broken.map((b) => (
              <li key={b.exerciseId} className="flex items-start justify-between gap-3">
                <span className="pt-1 text-[15px] font-medium text-chalk">
                  {EXERCISES[b.exerciseId]?.name ?? b.exerciseId}
                </span>
                <span className="text-right">
                  <span className="num block text-[24px] text-gold">
                    {fmtNum(b.weight)}
                    <span className="ml-1 font-sans text-[13px] font-normal text-gold/80">
                      kg × {b.reps}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ash">
                    wcześniej {fmtNum(b.previous.weight)} kg × {b.previous.reps}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {previous && previousTotals && (
        <div className="rounded-card border border-edge bg-panel p-4">
          <p className="label text-ash">
            Względem poprzedniego {session.day} · {formatShortDate(previous.startedAt)}
          </p>
          <div className="mt-3 space-y-2">
            <Delta label="Ciężar" now={totals.kg} before={previousTotals.kg} unit=" kg" />
            <Delta label="Powtórzenia" now={totals.reps} before={previousTotals.reps} />
            <Delta
              label="Czas"
              now={duration}
              before={sessionDuration(previous)}
              neutral
              format={(ms) => formatDuration(ms, false)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {session.exercises.map((exercise, i) => (
          <ExerciseSummary
            key={`${exercise.exerciseId}-${i}`}
            exercise={exercise}
            highlight={brokenIds.has(exercise.exerciseId)}
          />
        ))}
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  wide,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  wide?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${wide ? 'col-span-2' : ''} ${
        accent ? 'border-day/40 bg-day/10' : 'border-edge bg-panel'
      }`}
    >
      <p className={`label text-[10px] ${accent ? 'text-day' : 'text-ash'}`}>{label}</p>
      <p className={`num mt-2 ${wide ? 'text-[36px]' : 'text-[28px]'} text-chalk`}>
        {value}
        {unit && <span className="ml-1.5 font-sans text-[15px] font-normal text-ash">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * Różnica względem poprzedniego razu. Wzrost na zielono, spadek wyciszony —
 * słabszy trening to informacja, a nie wyrzut sumienia.
 */
function Delta({
  label,
  now,
  before,
  unit = '',
  neutral,
  format = (n) => fmtNum(n),
}: {
  label: string;
  now: number;
  before: number;
  unit?: string;
  neutral?: boolean;
  format?: (n: number) => string;
}) {
  const diff = now - before;
  const same = Math.abs(diff) < (neutral ? 60_000 : 0.001);
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-28 shrink-0 text-[14px] text-ash">{label}</span>
      <span className="text-[15px] font-medium text-chalk">
        {format(now)}
        {unit}
      </span>
      <span
        className={`ml-auto text-[14px] font-medium ${
          !same && !neutral && diff > 0 ? 'text-go' : 'text-dim'
        }`}
      >
        {same ? 'bez zmian' : `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}${unit}`}
      </span>
    </div>
  );
}

function ExerciseSummary({ exercise, highlight }: { exercise: SessionExercise; highlight: boolean }) {
  const info = EXERCISES[exercise.exerciseId];
  const totals = exerciseTotals(exercise);
  const top = highlight ? bestSet(exercise.sets) : null;
  const jump = exercise.variant ? JUMPS_BY_ID[exercise.variant] : undefined;

  return (
    <div className="rounded-card border border-edge bg-panel px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="display text-[22px] uppercase">{info?.name ?? exercise.exerciseId}</p>
        {totals.kg > 0 && (
          <p className="shrink-0 text-[13px] text-ash">
            <span className="num text-[17px] text-chalk">{fmtNum(totals.kg)}</span> kg
          </p>
        )}
      </div>
      {jump && <p className="mt-0.5 text-[13px] text-ash">{jump.name}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {exercise.sets.filter(counts).map((s) => (
          <span
            key={s.id}
            className={`num rounded-lg px-2.5 py-1.5 text-[17px] ${
              top && s.id === top.id ? 'bg-gold/15 text-gold' : 'bg-raised text-chalk'
            }`}
          >
            {fmtSet(s.weight, s.reps)}
          </span>
        ))}
      </div>
      {exercise.note && <p className="mt-2.5 text-[14px] text-ash">„{exercise.note}"</p>}
    </div>
  );
}
