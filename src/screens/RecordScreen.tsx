import { useMemo, useState } from 'react';
import { EXERCISES } from '../data/plan';
import { JUMPS_BY_ID } from '../data/jumps';
import { useLog } from '../store/store';
import { bestSet, counts, recordTimeline } from '../lib/stats';
import { goBack, navigate } from '../lib/router';
import { formatLongDate, formatShortDate } from '../lib/date';
import { fmtNum, fmtSet, plural } from '../lib/format';
import { BackBar, DayBadge, EmptyState, SectionTitle } from '../components/ui';
import { IconTrophy } from '../components/icons';

export function RecordScreen({ exerciseId }: { exerciseId: string }) {
  const sessions = useLog((s) => s.sessions);
  const info = EXERCISES[exerciseId];

  const timeline = useMemo(() => recordTimeline(sessions, exerciseId), [sessions, exerciseId]);
  const appearances = useMemo(
    () =>
      sessions.flatMap((session) =>
        session.exercises
          .filter((e) => e.exerciseId === exerciseId && e.sets.some(counts))
          .map((exercise) => ({ session, exercise, top: bestSet(exercise.sets)! })),
      ),
    [sessions, exerciseId],
  );

  if (!info) {
    return (
      <div>
        <BackBar title="Rekord" onBack={() => goBack('/profil')} />
        <p className="px-4 pt-6 text-ash">Nie ma takiego ćwiczenia.</p>
      </div>
    );
  }

  const current = timeline[timeline.length - 1] ?? null;
  const first = timeline[0] ?? null;
  const recordSessions = new Set(timeline.map((t) => t.sessionId));
  const points = appearances
    .filter((a) => a.top.weight)
    .map((a) => ({
      date: a.session.startedAt,
      weight: a.top.weight as number,
      reps: a.top.reps as number,
      record: recordSessions.has(a.session.id),
    }));

  return (
    <div>
      <BackBar title={info.name} onBack={() => goBack('/profil')} />

      <div className="space-y-3 px-4 pt-4">
        {current ? (
          <section className="rounded-[26px] border border-gold/35 bg-gold/[0.07] p-5">
            <p className="label flex items-center gap-1.5 text-gold">
              <IconTrophy className="size-4" />
              Rekord
            </p>
            <p className="num mt-3 text-[68px] leading-[0.82] text-gold">
              {fmtNum(current.weight)}
              <span className="ml-2 font-sans text-[18px] font-medium text-gold/80">
                kg × {current.reps}
              </span>
            </p>
            <p className="mt-3 text-[14px] text-ash first-letter:uppercase">
              {formatLongDate(current.date)} · trening {current.day}
            </p>
            {first && first !== current && (
              <p className="mt-3 text-[14px] text-chalk">
                Od pierwszego zapisu{' '}
                <span className="font-semibold text-go">+{fmtNum(current.weight - first.weight)} kg</span>
                <span className="text-ash">
                  {' '}
                  ({fmtNum(first.weight)} → {fmtNum(current.weight)})
                </span>
              </p>
            )}
          </section>
        ) : (
          <EmptyState
            title={info.kind === 'jump' ? 'Skoki bez obciążenia nie mają rekordu ciężaru' : 'Rekordu jeszcze nie ma'}
            hint={
              info.kind === 'jump'
                ? 'Jeśli skaczesz z kamizelką albo hantlami — wpisz ciężar, a rekord pojawi się tutaj.'
                : 'Zrób to ćwiczenie na treningu — najcięższa seria od razu stanie się rekordem do pobicia.'
            }
          />
        )}

        {points.length >= 2 && (
          <section className="rounded-card border border-edge bg-panel p-4">
            <ProgressChart points={points} />
          </section>
        )}

        {timeline.length > 0 && (
          <section className="pt-5">
            <SectionTitle
              aside={`${timeline.length} ${plural(timeline.length, 'rekord', 'rekordy', 'rekordów')}`}
            >
              Wszystkie rekordy
            </SectionTitle>
            <ol className="ml-1.5 border-l-2 border-edge">
              {timeline.map((hit, i) => {
                const previous = timeline[i - 1];
                const latest = i === timeline.length - 1;
                let change = 'pierwszy zapis';
                if (previous) {
                  change =
                    hit.weight > previous.weight
                      ? `+${fmtNum(hit.weight - previous.weight)} kg`
                      : `+${hit.reps - previous.reps} powt. przy tym samym ciężarze`;
                }
                return (
                  <li key={hit.sessionId} className="relative pb-4 pl-5 last:pb-0">
                    <span
                      className={`absolute top-2 -left-[7px] size-3 rounded-full ring-4 ring-night ${
                        latest ? 'bg-gold' : 'bg-ash'
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] text-ash">
                        {formatShortDate(hit.date)} · trening {hit.day}
                      </span>
                      <span className={`num text-[24px] ${latest ? 'text-gold' : 'text-chalk'}`}>
                        {fmtNum(hit.weight)}
                        <span className="ml-1 font-sans text-[13px] font-normal text-ash">
                          kg × {hit.reps}
                        </span>
                      </span>
                    </div>
                    <p className={`text-[12px] ${previous ? 'text-go' : 'text-dim'}`}>{change}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {appearances.length > 0 && (
          <section className="pt-5">
            <SectionTitle
              aside={`${appearances.length} ${plural(appearances.length, 'raz', 'razy', 'razy')}`}
            >
              Każdy trening
            </SectionTitle>
            <ul className="overflow-hidden rounded-card border border-edge bg-panel">
              {[...appearances].reverse().map(({ session, exercise }, i) => {
                const jump = exercise.variant ? JUMPS_BY_ID[exercise.variant] : undefined;
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/historia/${session.id}`)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left active:bg-raised ${
                        i ? 'border-t border-edge' : ''
                      }`}
                    >
                      <DayBadge day={session.day} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-ash">
                          {formatShortDate(session.startedAt)}
                          {jump ? ` · ${jump.name}` : ''}
                        </span>
                        <span className="num mt-1 block text-[17px] text-chalk">
                          {exercise.sets
                            .filter(counts)
                            .map((s) => fmtSet(s.weight, s.reps))
                            .join('  ·  ')}
                        </span>
                      </span>
                      {recordSessions.has(session.id) && (
                        <IconTrophy className="mt-1 size-4 shrink-0 text-gold" aria-label="rekord" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Wykres: najcięższa seria z każdego treningu ───────────────────────── */

interface Point {
  date: number;
  weight: number;
  reps: number;
  record: boolean;
}

function ProgressChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState(points.length - 1);
  const W = 320;
  const H = 168;
  const pad = { l: 34, r: 12, t: 12, b: 24 };

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 10;
  const lo = Math.max(0, Math.floor((min - span * 0.2) / 5) * 5);
  const hi = Math.ceil((max + span * 0.2) / 5) * 5;
  const t0 = points[0].date;
  const t1 = points[points.length - 1].date;

  const x = (d: number) => pad.l + (t1 === t0 ? 0.5 : (d - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (w: number) => pad.t + (1 - (w - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const shown = points[Math.min(active, points.length - 1)];

  return (
    <div>
      <p className="label text-ash">Najcięższa seria na treningu</p>
      <p className="mt-1.5 text-[13px] text-ash">
        {formatShortDate(shown.date)} ·{' '}
        <span className={`num text-[20px] ${shown.record ? 'text-gold' : 'text-chalk'}`}>
          {fmtNum(shown.weight)} kg × {shown.reps}
        </span>
        {shown.record && <span className="ml-1.5 text-gold">nowy rekord</span>}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-pan-y"
        role="img"
        aria-label={`Wykres ciężaru: od ${fmtNum(points[0].weight)} do ${fmtNum(points[points.length - 1].weight)} kg`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-edge)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" className="fill-dim text-[10px]">
              {fmtNum(t, 1)}
            </text>
          </g>
        ))}
        <line
          x1={x(shown.date)}
          x2={x(shown.date)}
          y1={pad.t}
          y2={H - pad.b}
          stroke="var(--color-edge)"
          strokeWidth={1}
        />
        <polyline
          points={points.map((p) => `${x(p.date)},${y(p.weight)}`).join(' ')}
          fill="none"
          stroke="var(--color-ash)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle
              cx={x(p.date)}
              cy={y(p.weight)}
              r={i === active ? 6 : p.record ? 5 : 4}
              fill={p.record ? 'var(--color-gold)' : 'var(--color-chalk)'}
              stroke="var(--color-panel)"
              strokeWidth={2}
            />
            <circle
              cx={x(p.date)}
              cy={y(p.weight)}
              r={14}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => setActive(i)}
              onPointerEnter={() => setActive(i)}
            />
          </g>
        ))}
        <text x={pad.l} y={H - 6} className="fill-dim text-[10px]">
          {formatShortDate(t0)}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-dim text-[10px]">
          {formatShortDate(t1)}
        </text>
      </svg>
      <p className="mt-1 flex items-center gap-3 text-[12px] text-dim">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-gold" /> nowy rekord
        </span>
        <span>dotknij punktu, żeby zobaczyć serię</span>
      </p>
    </div>
  );
}
