import { useEffect, useState } from 'react';
import { EXERCISES, PLAN, RULES, WARMUP_TIPS } from '../data/plan';
import { setPlanOverride, useActive, useLog } from '../store/store';
import { nextDay } from '../lib/schedule';
import { usePlan } from '../lib/plan';
import { fmtNum, fmtRange, parseNumber, toField } from '../lib/format';
import type { DayKey, PlanItem } from '../lib/types';
import {
  Button,
  Pips,
  ScreenTitle,
  SectionTitle,
  Sheet,
  Stepper,
  TagChip,
  showToast,
} from '../components/ui';
import { IconChevronRight, IconJump, IconPencil } from '../components/icons';
import { openJumps } from './JumpsScreen';

export function PlanScreen() {
  const sessions = useLog((s) => s.sessions);
  const active = useActive((s) => s.active);
  const [day, setDay] = useState<DayKey>(() => active?.day ?? nextDay(sessions));
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const plan = usePlan(day);

  return (
    <div>
      <ScreenTitle eyebrow="A i B na zmianę" title="Plan" />

      <div className="px-4">
        <DaySwitch value={day} onChange={setDay} />
      </div>

      <div data-day={day} className="mt-4 space-y-2.5 px-4">
        {plan.map((item, i) => (
          <PlanCard key={item.exerciseId} index={i + 1} item={item} onEdit={() => setEditing(item)} />
        ))}
      </div>

      <section className="mt-9 px-4">
        <SectionTitle>Zasady</SectionTitle>
        <ul className="overflow-hidden rounded-card border border-edge bg-panel">
          {RULES.map((rule, i) => (
            <li key={rule.lead} className={`px-4 py-3.5 ${i ? 'border-t border-edge' : ''}`}>
              <p className="text-[15px] font-semibold text-chalk">{rule.lead}</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-ash">{rule.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <div data-day={day}>
        <PlanEditSheet day={day} item={editing} onClose={() => setEditing(null)} />
      </div>
    </div>
  );
}

export function DaySwitch({ value, onChange }: { value: DayKey; onChange: (day: DayKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Trening">
      {(['A', 'B'] as const).map((d) => {
        const on = value === d;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={on}
            data-day={d}
            onClick={() => onChange(d)}
            className={`flex h-14 items-center justify-center gap-2.5 rounded-2xl border transition-colors ${
              on ? 'border-day bg-day/15 text-chalk' : 'border-edge bg-panel text-ash active:bg-raised'
            }`}
          >
            <span className={`display pt-[0.08em] text-[30px] ${on ? 'text-day' : ''}`}>{d}</span>
            <span className="text-[15px] font-medium">Trening {d}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ index, item, onEdit }: { index: number; item: PlanItem; onEdit: () => void }) {
  const exercise = EXERCISES[item.exerciseId];

  if (exercise.kind === 'warmup') {
    return (
      <article className="rounded-card border border-dashed border-edge bg-panel/60 p-4">
        <div className="flex items-start gap-3">
          <span className="num mt-0.5 w-6 text-[17px] text-dim">{String(index).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <TagChip tag={exercise.tag} />
            <h3 className="display mt-2 text-[28px] uppercase">{exercise.name}</h3>
          </div>
          <p className="num text-[30px] text-day">
            {fmtRange(item.reps.min, item.reps.max)}
            <span className="ml-1 font-sans text-[13px] font-normal text-ash">min</span>
          </p>
        </div>
        <div className="mt-3 ml-9 border-t border-edge pt-3">
          <p className="label text-dim">Propozycja</p>
          <ul className="mt-2 space-y-1.5">
            {WARMUP_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-[14px] leading-snug text-ash">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ash" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </article>
    );
  }

  const notes = [
    item.note,
    exercise.cue,
    exercise.trimWhenTired ? 'Nogi zmęczone po koszu? To ćwiczenie tniesz jako pierwsze.' : undefined,
  ].filter((n): n is string => Boolean(n));
  const optional = item.sets.min !== item.sets.max;

  return (
    <article className={`rounded-card border bg-panel p-4 ${item.edited ? 'border-day/40' : 'border-edge'}`}>
      <div className="flex items-start gap-3">
        <span className="num mt-0.5 w-6 text-[17px] text-dim">{String(index).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TagChip tag={exercise.tag} />
            {exercise.perLeg && (
              <span className="label rounded-md bg-raised px-1.5 py-[5px] text-[10px] text-chalk">
                na nogę
              </span>
            )}
            {item.edited && (
              <span className="label rounded-md bg-day/15 px-1.5 py-[5px] text-[10px] text-day">
                zmienione
              </span>
            )}
          </div>
          <h3 className="display mt-2 text-[28px] uppercase">{exercise.name}</h3>
          {exercise.alias && <p className="mt-1 text-[13px] text-ash">{exercise.alias}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-[32px] text-day">
            {fmtRange(item.sets.min, item.sets.max)}
            <span className="mx-1 text-ash">×</span>
            {fmtRange(item.reps.min, item.reps.max)}
          </p>
          <p className="mt-1 text-[12px] text-ash">serie × powt.</p>
          {item.weight != null && (
            <p className="mt-1.5 text-[12px] text-ash">
              <span className="num text-[18px] text-chalk">{fmtNum(item.weight)}</span> kg
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 ml-9 flex items-center gap-2.5">
        <Pips min={item.sets.min} max={item.sets.max} />
        {optional && <span className="text-[12px] text-ash">ostatnia seria opcjonalna</span>}
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 ml-9 space-y-1.5 border-t border-edge pt-3">
          {notes.map((note) => (
            <li key={note} className="flex gap-2 text-[14px] leading-snug text-ash">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-day" />
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 ml-9 grid gap-2">
        {exercise.kind === 'jump' && (
          <button
            type="button"
            onClick={() => openJumps(false)}
            className="flex h-12 items-center gap-2.5 rounded-xl border border-edge px-3 text-left text-[14px] font-medium active:bg-raised"
          >
            <IconJump className="size-5 text-day" />
            <span className="flex-1">Warianty skoków — z animacją</span>
            <IconChevronRight className="size-5 text-dim" />
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex h-11 items-center gap-2 rounded-xl px-1 text-left text-[14px] text-ash active:text-chalk"
        >
          <IconPencil className="size-4" />
          Zmień serie, powtórzenia albo ciężar
        </button>
      </div>
    </article>
  );
}

/* ── Zmiana ćwiczenia w planie ─────────────────────────────────────────── */

function PlanEditSheet({
  day,
  item,
  onClose,
}: {
  day: DayKey;
  item: PlanItem | null;
  onClose: () => void;
}) {
  const [sets, setSets] = useState(1);
  const [optional, setOptional] = useState(0);
  const [repsMin, setRepsMin] = useState(1);
  const [repsMax, setRepsMax] = useState(1);
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (!item) return;
    setSets(item.sets.min);
    setOptional(item.sets.max - item.sets.min);
    setRepsMin(item.reps.min);
    setRepsMax(item.reps.max);
    setWeight(toField(item.weight ?? null));
  }, [item]);

  const original = item ? PLAN[day].find((p) => p.exerciseId === item.exerciseId) : undefined;
  const info = item ? EXERCISES[item.exerciseId] : undefined;
  const parsedWeight = parseNumber(weight);

  const save = () => {
    if (!item || !original) return;
    const change = {
      sets: { min: sets, max: sets + optional },
      reps: { min: repsMin, max: Math.max(repsMin, repsMax) },
      weight: parsedWeight,
    };
    const sameAsFile =
      change.sets.min === original.sets.min &&
      change.sets.max === original.sets.max &&
      change.reps.min === original.reps.min &&
      change.reps.max === original.reps.max &&
      change.weight === null;
    setPlanOverride(day, item.exerciseId, sameAsFile ? null : change);
    showToast('ok', 'Plan zapisany');
    onClose();
  };

  const reset = () => {
    if (!item) return;
    setPlanOverride(day, item.exerciseId, null);
    showToast('info', 'Przywrócono plan z pliku');
    onClose();
  };

  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={info?.name}
      subtitle={`Trening ${day} · zmiana obowiązuje od następnego treningu`}
    >
      {item && original && (
        <div>
          <div className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
            <Row label="Serie" hint="zawsze do zrobienia">
              <Stepper value={sets} min={1} max={10} label="Serie" onChange={setSets} />
            </Row>
            <Row label="Serie opcjonalne" hint="jeśli nogi dają radę">
              <Stepper value={optional} min={0} max={3} label="Serie opcjonalne" onChange={setOptional} />
            </Row>
            <Row label="Powtórzenia od">
              <Stepper
                value={repsMin}
                min={1}
                max={30}
                label="Powtórzenia od"
                onChange={(v) => {
                  setRepsMin(v);
                  if (repsMax < v) setRepsMax(v);
                }}
              />
            </Row>
            <Row label="Powtórzenia do" hint={info?.perLeg ? 'na nogę' : undefined}>
              <Stepper value={repsMax} min={repsMin} max={30} label="Powtórzenia do" onChange={setRepsMax} />
            </Row>
            <Row label="Ciężar" hint="opcjonalnie — podpowie się na treningu">
              <label className="relative block">
                <span className="sr-only">Ciężar w planie</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={weight}
                  placeholder="—"
                  onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
                  className="num h-12 w-[124px] rounded-xl border border-edge bg-night pr-9 pl-3 text-right text-[26px] text-chalk outline-none placeholder:text-dim focus:border-day"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-dim">
                  kg
                </span>
              </label>
            </Row>
          </div>

          <p className="mt-4 text-center text-[14px] text-ash">
            W planie będzie{' '}
            <span className="num text-[22px] text-day">
              {fmtRange(sets, sets + optional)} × {fmtRange(repsMin, Math.max(repsMin, repsMax))}
            </span>
            {parsedWeight !== null && (
              <span className="num text-[22px] text-chalk"> · {fmtNum(parsedWeight)} kg</span>
            )}
          </p>

          <div className="mt-4 grid gap-2">
            <Button variant="day" size="lg" full onClick={save}>
              Zapisz w planie
            </Button>
            {item.edited && (
              <Button variant="ghost" size="md" full onClick={reset}>
                Przywróć z pliku ({fmtRange(original.sets.min, original.sets.max)} ×{' '}
                {fmtRange(original.reps.min, original.reps.max)})
              </Button>
            )}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-dim">
            Trening w toku i zapisana historia się nie zmieniają. W trakcie treningu serie dodajesz
            przyciskiem „+ Seria", a powtórzenia i ciężar wpisujesz przy każdej serii.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-panel px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-chalk">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-ash">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
