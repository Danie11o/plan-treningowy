import { useEffect, useMemo, useRef, useState } from 'react';
import { EXERCISES, PLAN, WARMUP_TIPS } from '../data/plan';
import { JUMPS_BY_ID } from '../data/jumps';
import {
  discardWorkout,
  finishWorkout,
  saveEditedSession,
  updateActive,
  useActive,
  useLog,
} from '../store/store';
import {
  addSet,
  filledButOpen,
  lastDoneAt,
  patchExercise,
  patchSet,
  removeSet,
  setProgress,
} from '../lib/session';
import {
  bestSet,
  counts,
  currentRecord,
  isBetter,
  lastPerformance,
  sessionTotals,
  suggestion,
  type LastPerformance,
  type RecordHit,
} from '../lib/stats';
import { goBack, leaveOverlays, navigate } from '../lib/router';
import { useNow } from '../lib/useNow';
import { buzz, useWakeLock } from '../lib/wakeLock';
import { formatClock, formatDuration, formatLongDate, formatShortDate, formatTime } from '../lib/date';
import { fmtKg, fmtNum, fmtRange, fmtSet, parseNumber, plural, toField } from '../lib/format';
import type { ExerciseKind, Session, SessionExercise, SetEntry } from '../lib/types';
import { BackBar, Button, Confirm, Pips, Sheet, showToast } from '../components/ui';
import { StatTile } from '../components/SessionReport';
import { JumpFigure } from '../components/JumpFigure';
import {
  IconCheck,
  IconChevronLeft,
  IconInfo,
  IconJump,
  IconMinus,
  IconNote,
  IconPlus,
  IconTrophy,
} from '../components/icons';
import { openJumps } from './JumpsScreen';

type Change = (change: (session: Session) => Session) => void;
type Mode = 'active' | 'edit';

/* ── Trening w toku ────────────────────────────────────────────────────── */

export function WorkoutScreen() {
  const active = useActive((s) => s.active);
  const sessions = useLog((s) => s.sessions);
  const [finishOpen, setFinishOpen] = useState(false);

  useWakeLock(active !== null);

  useEffect(() => {
    // Wejście na #/trening bez treningu w toku (np. stara zakładka) — na start.
    if (!useActive.getState().active) navigate('/', { replace: true });
  }, []);

  if (!active) return null;

  return (
    <div data-day={active.day} className="min-h-dvh pb-16">
      <WorkoutHeader session={active} onFinish={() => setFinishOpen(true)} />
      <SessionBody session={active} history={sessions} onChange={updateActive} mode="active" />
      <div className="px-4 pt-6">
        <Button variant="day" size="lg" full onClick={() => setFinishOpen(true)}>
          <IconCheck className="size-5" strokeWidth={2.6} />
          Zakończ trening
        </Button>
      </div>
      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        session={active}
        history={sessions}
      />
    </div>
  );
}

/* ── Poprawianie zapisanego treningu ───────────────────────────────────── */

export function EditSessionScreen({ id }: { id: string }) {
  const sessions = useLog((s) => s.sessions);
  const original = sessions.find((s) => s.id === id) ?? null;
  const [draft, setDraft] = useState<Session | null>(original);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!original || !draft) {
    return (
      <div>
        <BackBar title="Trening" onBack={() => goBack('/historia')} />
        <p className="px-4 pt-6 text-[15px] text-ash">Tego treningu już nie ma.</p>
      </div>
    );
  }

  const dirty = draft !== original;
  const change: Change = (fn) => setDraft((d) => (d ? fn(d) : d));

  const save = () => {
    saveEditedSession(draft);
    showToast('ok', 'Zmiany zapisane');
    goBack(`/historia/${id}`);
  };

  return (
    <div data-day={draft.day} className="min-h-dvh pb-16">
      <BackBar
        title={`Poprawiasz trening ${draft.day}`}
        onBack={() => (dirty ? setConfirmLeave(true) : goBack(`/historia/${id}`))}
        right={
          <Button variant="day" size="sm" className="mr-1" disabled={!dirty} onClick={save}>
            Zapisz
          </Button>
        }
      />
      <p className="px-4 pt-4 text-[14px] leading-relaxed text-ash">
        <span className="first-letter:uppercase">{formatLongDate(draft.startedAt)}</span>. Odhaczona
        seria zostaje, odznaczona zniknie po zapisie. Rekordy i sumy przeliczą się same.
      </p>
      <SessionBody session={draft} history={sessions} onChange={change} mode="edit" />
      <div className="px-4 pt-6">
        <Button variant="day" size="lg" full disabled={!dirty} onClick={save}>
          Zapisz zmiany
        </Button>
      </div>
      <Confirm
        open={confirmLeave}
        title="Porzucić zmiany?"
        message="Poprawki w tym treningu nie zostaną zapisane."
        confirmLabel="Porzuć zmiany"
        danger
        onConfirm={async () => {
          await leaveOverlays();
          goBack(`/historia/${id}`);
        }}
        onClose={() => setConfirmLeave(false)}
      />
    </div>
  );
}

/* ── Nagłówek z zegarem ────────────────────────────────────────────────── */

function WorkoutHeader({ session, onFinish }: { session: Session; onFinish: () => void }) {
  const now = useNow(1000);
  const { done, planned } = setProgress(session);
  const lastAt = lastDoneAt(session);
  // Przerwa liczy się od ostatniej odhaczonej serii — widać, ile już odpoczywasz.
  const rest = lastAt !== null && now - lastAt < 20 * 60_000 && done < planned ? now - lastAt : null;

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-edge/70 bg-night/92 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-2">
        <button
          type="button"
          onClick={() => goBack('/')}
          aria-label="Wróć na ekran Dziś — trening dalej trwa"
          className="grid size-11 shrink-0 place-items-center rounded-full text-ash active:bg-panel"
        >
          <IconChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="label text-day">Trening {session.day}</p>
          <p className="num mt-1 text-[30px] leading-none text-chalk">
            {formatClock(now - session.startedAt)}
          </p>
        </div>
        {rest !== null && (
          <div className="mr-1 text-right">
            <p className="label text-[10px] text-ash">Przerwa</p>
            <p className="num mt-1 text-[22px] leading-none text-chalk">{formatClock(rest)}</p>
          </div>
        )}
        <Button variant="outline" size="sm" className="mr-1" onClick={onFinish}>
          Zakończ
        </Button>
      </div>
      <ProgressRail session={session} />
    </header>
  );
}

/** Pasek postępu: jeden odcinek na ćwiczenie, dotknięcie przewija do niego. */
function ProgressRail({ session }: { session: Session }) {
  return (
    <div className="flex gap-1 px-4 pb-1">
      {session.exercises.map((exercise, i) => {
        const planned = exercise.sets.filter((s) => !s.optional || s.done).length || 1;
        const done = exercise.sets.filter((s) => s.done).length;
        return (
          <button
            key={`${exercise.exerciseId}-${i}`}
            type="button"
            aria-label={`Przewiń do: ${EXERCISES[exercise.exerciseId]?.name ?? ''}`}
            onClick={() =>
              document
                .getElementById(`cwiczenie-${i}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            style={{ flexGrow: planned }}
            className="basis-0 py-2"
          >
            <span className="relative block h-1.5 overflow-hidden rounded-full bg-edge">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-day transition-[width] duration-300"
                style={{ width: `${Math.min(100, (done / planned) * 100)}%` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Lista ćwiczeń ─────────────────────────────────────────────────────── */

function SessionBody({
  session,
  history,
  onChange,
  mode,
}: {
  session: Session;
  history: Session[];
  onChange: Change;
  mode: Mode;
}) {
  // Przy poprawianiu starego treningu „ostatnio" i „rekord" liczą się z tego,
  // co było przed nim — inaczej trening porównywałby się sam ze sobą.
  const prior = useMemo(
    () =>
      mode === 'edit'
        ? history.filter((h) => h.id !== session.id && h.startedAt < session.startedAt)
        : history,
    [history, mode, session.id, session.startedAt],
  );

  return (
    <div className="space-y-3 px-4 pt-4">
      {mode === 'active' && <WarmupCard session={session} onChange={onChange} />}
      {session.exercises.map((exercise, index) => (
        <ExerciseCard
          key={`${exercise.exerciseId}-${index}`}
          index={index}
          session={session}
          exercise={exercise}
          prior={prior}
          onChange={onChange}
          mode={mode}
        />
      ))}
      {session.exercises.length === 0 && (
        <p className="py-6 text-center text-[14px] text-ash">W tym treningu nie ma żadnych serii.</p>
      )}
    </div>
  );
}

function planNumber(session: Session, exerciseId: string, index: number): string {
  const i = PLAN[session.day].findIndex((p) => p.exerciseId === exerciseId);
  return String(i >= 0 ? i + 1 : index + 2).padStart(2, '0');
}

function WarmupCard({ session, onChange }: { session: Session; onChange: Change }) {
  const [showTips, setShowTips] = useState(false);
  const item = PLAN[session.day].find((p) => EXERCISES[p.exerciseId].kind === 'warmup');
  if (!item) return null;
  const done = session.warmupDone;

  return (
    <article
      className={`rounded-card border p-4 transition-colors ${
        done ? 'border-go/40 bg-go/[0.06]' : 'border-dashed border-edge bg-panel/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="num w-6 shrink-0 text-[17px] text-dim">01</span>
        <div className="min-w-0 flex-1">
          <h3 className="display text-[27px] uppercase">Rozgrzewka</h3>
          <p className="mt-1 text-[13px] text-ash">
            {fmtRange(item.reps.min, item.reps.max)} min{done ? ' · zrobiona' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange((s) => ({ ...s, warmupDone: !s.warmupDone, updatedAt: Date.now() }))}
          aria-pressed={done}
          aria-label={done ? 'Cofnij rozgrzewkę' : 'Rozgrzewka zrobiona'}
          className={`grid h-12 w-[52px] shrink-0 place-items-center rounded-xl border-2 transition-colors ${
            done ? 'border-go bg-go text-[#03220f]' : 'border-edge text-dim active:bg-raised'
          }`}
        >
          <IconCheck className="size-6" strokeWidth={2.6} />
        </button>
      </div>
      {!done && (
        <div className="ml-9">
          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="mt-1 h-9 text-[14px] font-medium text-day"
          >
            {showTips ? 'Schowaj propozycję' : 'Pokaż propozycję rozgrzewki'}
          </button>
          {showTips && (
            <ul className="mt-1 space-y-1.5">
              {WARMUP_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-[14px] leading-snug text-ash">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-day" />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function ExerciseCard({
  index,
  session,
  exercise,
  prior,
  onChange,
  mode,
}: {
  index: number;
  session: Session;
  exercise: SessionExercise;
  prior: Session[];
  onChange: Change;
  mode: Mode;
}) {
  const info = EXERCISES[exercise.exerciseId] ?? {
    id: exercise.exerciseId,
    name: exercise.exerciseId,
    kind: 'weighted' as const,
    tag: 'Siła' as const,
  };
  const last = useMemo(
    () => lastPerformance(prior, exercise.exerciseId, session.day),
    [prior, exercise.exerciseId, session.day],
  );
  const record = useMemo(() => currentRecord(prior, exercise.exerciseId), [prior, exercise.exerciseId]);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(exercise.note !== '');
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const planItem = PLAN[session.day].find((p) => p.exerciseId === exercise.exerciseId);
  const needsWeight = info.kind === 'weighted';
  const { sets: targetSets, reps: targetReps } = exercise.target;
  const doneCount = exercise.sets.filter((s) => s.done).length;
  const plannedDone = exercise.sets.filter((s) => !s.optional).every((s) => s.done);
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const notes = [planItem?.note, info.cue].filter((n): n is string => Boolean(n));
  const planWeight = exercise.target.weight ?? null;

  /** Podpowiedź do serii: ciężar z planu, jeśli go wpisałeś, inaczej to, co ostatnio. */
  const hintFor = (i: number) => {
    const hint = suggestion(last, i, targetReps.max);
    return planWeight !== null ? { ...hint, weight: planWeight } : hint;
  };

  const toggle = (set: SetEntry, i: number) => {
    if (set.done) {
      onChange((s) => patchSet(s, index, set.id, { done: false, doneAt: null }));
      return;
    }
    // Puste pole = to samo, co podpowiedź (szary tekst). Najczęściej wystarczy ✓.
    const hint = hintFor(i);
    const weight = set.weight ?? hint.weight;
    const reps = set.reps ?? hint.reps;
    if (needsWeight && weight === null) {
      setShakeId(set.id);
      window.setTimeout(() => setShakeId(null), 400);
      inputs.current.get(set.id)?.focus();
      showToast('info', 'Wpisz ciężar tej serii');
      return;
    }

    const earlier = bestSet(exercise.sets.filter((s) => s.done && s.id !== set.id));
    const bar =
      earlier?.weight && isBetter(earlier.weight, earlier.reps ?? 0, record) ? earlier : record;

    onChange((s) => patchSet(s, index, set.id, { done: true, doneAt: Date.now(), weight, reps }));
    buzz(15);

    if (mode === 'active' && record && weight && isBetter(weight, reps, bar)) {
      showToast('pr', `Nowy rekord: ${fmtNum(weight)} kg × ${reps}`);
      buzz([30, 70, 140]);
    }
  };

  return (
    <article
      id={`cwiczenie-${index}`}
      className={`scroll-mt-32 rounded-card border bg-panel transition-colors ${
        plannedDone ? 'border-day/45' : 'border-edge'
      }`}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="num mt-0.5 w-6 shrink-0 text-[17px] text-dim">
          {planNumber(session, exercise.exerciseId, index)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="display text-[27px] uppercase">{info.name}</h3>
          {info.alias && <p className="mt-1 text-[13px] text-ash">{info.alias}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-[28px] text-day">
            {fmtRange(targetSets.min, targetSets.max)}
            <span className="mx-0.5 text-ash">×</span>
            {fmtRange(targetReps.min, targetReps.max)}
          </p>
          <div className="mt-1.5 flex justify-end">
            <Pips min={targetSets.min} max={targetSets.max} done={doneCount} />
          </div>
          {planWeight !== null && (
            <p className="mt-1.5 text-[12px] text-ash">
              plan: <span className="num text-[15px] text-chalk">{fmtNum(planWeight)}</span> kg
            </p>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="mt-2.5 mr-4 ml-[52px] space-y-1">
          {notes.map((note) => (
            <li key={note} className="flex gap-2 text-[13.5px] leading-snug text-ash">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-day" />
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5 px-3">
        <RefTiles last={last} record={record} kind={info.kind} />
      </div>

      {info.kind === 'jump' && <VariantRow variant={exercise.variant} mode={mode} />}

      {info.weightHint && (
        <p className="mx-4 mt-2.5 flex gap-1.5 text-[13px] leading-snug text-ash">
          <IconInfo className="mt-px size-4 shrink-0 text-dim" />
          {info.weightHint}
        </p>
      )}

      <div className="mt-3 px-3">
        <div className="grid grid-cols-[30px_1fr_74px_52px] items-end gap-2 px-1 pb-1.5">
          <span className="label text-center text-[10px] text-dim">Seria</span>
          <span className="label text-[10px] text-dim">
            Ciężar{info.kind === 'jump' ? ' · opcjonalnie' : ''}
          </span>
          <span className="label text-center text-[10px] text-dim">
            {info.perLeg ? 'Powt./noga' : 'Powt.'}
          </span>
          <span />
        </div>
        <div className="space-y-1.5">
          {exercise.sets.map((set, i) => (
            <SetRow
              key={set.id}
              number={i + 1}
              set={set}
              hint={hintFor(i)}
              needsWeight={needsWeight}
              shaking={shakeId === set.id}
              isRecord={Boolean(
                set.done && set.weight && set.reps && record && isBetter(set.weight, set.reps, record),
              )}
              weightRef={(el) => {
                if (el) inputs.current.set(set.id, el);
                else inputs.current.delete(set.id);
              }}
              onPatch={(patch) => onChange((s) => patchSet(s, index, set.id, patch))}
              onToggle={() => toggle(set, i)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pt-2.5 pb-3">
        <button
          type="button"
          onClick={() => onChange((s) => addSet(s, index))}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge text-[14px] text-ash active:bg-raised active:text-chalk"
        >
          <IconPlus className="size-4" />
          Seria
        </button>
        {exercise.sets.length > 1 && lastSet && !lastSet.done && (
          <button
            type="button"
            onClick={() => onChange((s) => removeSet(s, index, lastSet.id))}
            aria-label="Usuń ostatnią serię"
            className="grid size-11 place-items-center rounded-xl border border-edge text-dim active:bg-raised active:text-chalk"
          >
            <IconMinus className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setNoteOpen((open) => !open)}
          aria-expanded={noteOpen}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[14px] active:bg-raised ${
            noteOpen || exercise.note ? 'border-day/50 text-chalk' : 'border-edge text-ash'
          }`}
        >
          <IconNote className="size-4" />
          Notatka
        </button>
      </div>
      {noteOpen && (
        <div className="px-3 pb-3">
          <input
            value={exercise.note}
            onChange={(e) => onChange((s) => patchExercise(s, index, { note: e.target.value }))}
            placeholder={info.kind === 'jump' ? 'np. box 70 cm, świeże nogi' : 'np. szło ciężko, kolano ok'}
            aria-label="Notatka do ćwiczenia"
            className="h-12 w-full rounded-xl border border-edge bg-night px-3 text-[15px] outline-none placeholder:text-dim focus:border-day"
          />
        </div>
      )}
    </article>
  );
}

/* ── Ostatnio i rekord — nad seriami, zanim cokolwiek wpiszesz ─────────── */

function RefTiles({
  last,
  record,
  kind,
}: {
  last: LastPerformance | null;
  record: RecordHit | null;
  kind: ExerciseKind;
}) {
  const lastSets = last ? last.exercise.sets.filter(counts) : [];
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="min-w-0 rounded-2xl border border-edge bg-night/55 px-3 py-2.5">
        <p className="label text-[10px] text-ash">
          Ostatnio{last && !last.sameDay ? ` · na ${last.session.day}` : ''}
        </p>
        {last ? (
          <>
            <p className="num mt-1.5 text-[26px] text-chalk">
              {last.top.weight ? fmtNum(last.top.weight) : last.top.reps}
              <span className="ml-1 font-sans text-[13px] font-normal text-ash">
                {last.top.weight ? `kg × ${last.top.reps}` : 'powt.'}
              </span>
            </p>
            <p className="mt-1 truncate text-[12px] text-dim">
              {formatShortDate(last.session.startedAt)} ·{' '}
              {lastSets.map((s) => fmtSet(s.weight, s.reps)).join(' · ')}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-dim">pierwszy raz</p>
        )}
      </div>
      <div className="min-w-0 rounded-2xl border border-gold/30 bg-gold/[0.07] px-3 py-2.5">
        <p className="label flex items-center gap-1 text-[10px] text-gold">
          <IconTrophy className="size-3" />
          Rekord
        </p>
        {record ? (
          <>
            <p className="num mt-1.5 text-[26px] text-gold">
              {fmtNum(record.weight)}
              <span className="ml-1 font-sans text-[13px] font-normal text-gold/80">
                kg × {record.reps}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-dim">{formatShortDate(record.date)}</p>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-dim">
            {kind === 'jump' ? 'bez obciążenia' : 'jeszcze brak'}
          </p>
        )}
      </div>
    </div>
  );
}

function VariantRow({ variant, mode }: { variant: string | null; mode: Mode }) {
  const jump = variant ? JUMPS_BY_ID[variant] : undefined;
  const content = (
    <>
      <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-night">
        {jump ? <JumpFigure jump={jump} still className="h-12 w-16" /> : <IconJump className="size-6 text-day" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="label block text-[10px] text-ash">Wariant skoku</span>
        <span className="mt-1 block truncate text-[15px] font-medium text-chalk">
          {jump ? jump.name : 'Wybierz, co dziś skaczesz'}
        </span>
      </span>
      {mode === 'active' && (
        <span className="flex shrink-0 items-center gap-1 text-[14px] font-medium text-day">
          <IconInfo className="size-5" />
          {jump ? 'Zmień' : 'Warianty'}
        </span>
      )}
    </>
  );

  if (mode !== 'active') {
    return (
      <div className="mx-3 mt-2.5 flex items-center gap-3 rounded-2xl border border-edge bg-night/40 p-2 pr-3">
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openJumps(true)}
      className="mx-3 mt-2.5 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-edge bg-night/40 p-2 pr-3 text-left active:bg-raised"
    >
      {content}
    </button>
  );
}

/* ── Wiersz serii ──────────────────────────────────────────────────────── */

function SetRow({
  number,
  set,
  hint,
  needsWeight,
  shaking,
  isRecord,
  weightRef,
  onPatch,
  onToggle,
}: {
  number: number;
  set: SetEntry;
  hint: { weight: number | null; reps: number };
  needsWeight: boolean;
  shaking: boolean;
  isRecord: boolean;
  weightRef: (el: HTMLInputElement | null) => void;
  onPatch: (patch: Partial<SetEntry>) => void;
  onToggle: () => void;
}) {
  // Pola trzymają surowy tekst („62,"), a do zapisu idzie liczba.
  const [weightText, setWeightText] = useState(toField(set.weight));
  const [repsText, setRepsText] = useState(set.reps === null ? '' : String(set.reps));

  useEffect(() => {
    setWeightText((t) => (parseNumber(t) === set.weight ? t : toField(set.weight)));
  }, [set.weight]);
  useEffect(() => {
    setRepsText((t) => (parseNumber(t) === set.reps ? t : set.reps === null ? '' : String(set.reps)));
  }, [set.reps]);

  const untouched = set.optional && !set.done && set.weight === null && set.reps === null;

  return (
    <div
      className={`grid grid-cols-[30px_1fr_74px_52px] items-center gap-2 rounded-2xl p-1 transition-colors ${
        set.done ? 'bg-day/12' : ''
      } ${shaking ? 'animate-shake' : ''} ${untouched ? 'opacity-60' : ''}`}
    >
      <span className="flex flex-col items-center leading-none">
        <span className={`num text-[20px] ${set.done ? 'text-day' : 'text-ash'}`}>{number}</span>
        {set.optional && <span className="mt-1 text-[9px] tracking-wide text-dim uppercase">opcj.</span>}
      </span>

      <label className="relative block">
        <span className="sr-only">Ciężar, seria {number}</span>
        <input
          ref={weightRef}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          value={weightText}
          placeholder={hint.weight !== null ? toField(hint.weight) : needsWeight ? '' : '—'}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d.,]/g, '').slice(0, 6);
            setWeightText(value);
            onPatch({ weight: parseNumber(value) });
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="num h-12 w-full rounded-xl border border-edge bg-night pr-8 pl-3 text-[24px] text-chalk outline-none placeholder:text-dim focus:border-day"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-dim">
          kg
        </span>
      </label>

      <label className="block">
        <span className="sr-only">Powtórzenia, seria {number}</span>
        <input
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          value={repsText}
          placeholder={String(hint.reps)}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 3);
            setRepsText(value);
            onPatch({ reps: value === '' ? null : Number(value) });
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="num h-12 w-full rounded-xl border border-edge bg-night text-center text-[24px] text-chalk outline-none placeholder:text-dim focus:border-day"
        />
      </label>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={set.done}
        aria-label={set.done ? `Cofnij serię ${number}` : `Zalicz serię ${number}`}
        className={`relative grid h-12 w-[52px] place-items-center rounded-xl border-2 transition-colors ${
          set.done ? 'border-day bg-day text-day-ink' : 'border-edge text-dim active:bg-raised'
        }`}
      >
        <IconCheck className="size-6" strokeWidth={2.6} />
        {isRecord && (
          <span className="animate-pop absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-gold text-[#2a1d00] ring-2 ring-panel">
            <IconTrophy className="size-3" strokeWidth={2.4} />
          </span>
        )}
      </button>
    </div>
  );
}

/* ── Zakończenie ───────────────────────────────────────────────────────── */

/** Odhacza serie, w których coś wpisano, a nie kliknięto ✓. */
function checkFilledSets(session: Session, history: Session[]): Session {
  const now = Date.now();
  return {
    ...session,
    updatedAt: now,
    exercises: session.exercises.map((exercise) => {
      const last = lastPerformance(history, exercise.exerciseId, session.day);
      const needsWeight = EXERCISES[exercise.exerciseId]?.kind === 'weighted';
      return {
        ...exercise,
        sets: exercise.sets.map((set, i) => {
          if (set.done || (set.weight === null && set.reps === null)) return set;
          const hint = suggestion(last, i, exercise.target.reps.max);
          const weight = set.weight ?? exercise.target.weight ?? hint.weight;
          if (needsWeight && weight === null) return set;
          return { ...set, weight, reps: set.reps ?? hint.reps, done: true, doneAt: now };
        }),
      };
    }),
  };
}

function FinishSheet({
  open,
  onClose,
  session,
  history,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
  history: Session[];
}) {
  const now = useNow(1000, open);
  const [trimToLast, setTrimToLast] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const totals = sessionTotals(session);
  const lastAt = lastDoneAt(session);
  const elapsed = now - session.startedAt;
  // Trening „trwający" 5 godzin to prawie zawsze zapomniane „Zakończ".
  const forgotten = elapsed > 3 * 3_600_000 && lastAt !== null;
  const end = forgotten && trimToLast && lastAt !== null ? lastAt : now;
  const open_ = filledButOpen(session);

  const save = async () => {
    const finishedAt = forgotten && trimToLast && lastAt !== null ? lastAt : Date.now();
    await leaveOverlays();
    const saved = finishWorkout(finishedAt);
    if (saved) navigate(`/podsumowanie/${saved.id}`, { replace: true });
  };

  const discard = async () => {
    await leaveOverlays();
    discardWorkout();
    navigate('/', { replace: true });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Zakończyć trening?">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Czas treningu" value={formatDuration(end - session.startedAt)} wide />
        <StatTile label="Podniesiony ciężar" value={fmtNum(totals.kg)} unit="kg" wide accent />
        <StatTile label="Serie" value={String(totals.sets)} />
        <StatTile label="Powtórzenia" value={fmtNum(totals.reps)} />
      </div>

      {open_ > 0 && (
        <div className="mt-3 rounded-2xl border border-gold/35 bg-gold/[0.07] p-3.5">
          <p className="text-[14px] leading-relaxed text-chalk">
            {open_} {plural(open_, 'seria ma', 'serie mają', 'serii ma')} wpisane liczby, ale bez ✓ —
            nie wejdą do historii.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2.5"
            onClick={() => updateActive((s) => checkFilledSets(s, history))}
          >
            <IconCheck className="size-4" />
            Odhacz je
          </Button>
        </div>
      )}

      {forgotten && lastAt !== null && (
        <label className="mt-3 flex gap-3 rounded-2xl border border-edge bg-night/50 p-3.5">
          <input
            type="checkbox"
            checked={trimToLast}
            onChange={(e) => setTrimToLast(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--day)]"
          />
          <span className="text-[14px] leading-relaxed text-ash">
            Trening trwa już {formatDuration(elapsed, false)} — pewnie został otwarty. Licz czas do
            ostatniej serii ({formatTime(lastAt)}).
          </span>
        </label>
      )}

      {totals.sets === 0 ? (
        <p className="mt-4 text-[14px] leading-relaxed text-ash">
          Nie ma jeszcze żadnej odhaczonej serii, więc nie ma czego zapisać.
        </p>
      ) : (
        <p className="mt-4 text-[14px] leading-relaxed text-ash">
          Zapisuje się to, co ma ✓. Puste serie znikną.
        </p>
      )}

      <div className="mt-4 grid gap-2">
        <Button variant="day" size="lg" full disabled={totals.sets === 0} onClick={save}>
          Zapisz trening
        </Button>
        <Button variant="ghost" size="md" full onClick={onClose}>
          Wróć do treningu
        </Button>
        <Button variant="danger" size="md" full onClick={() => setConfirmDiscard(true)}>
          Odrzuć trening
        </Button>
      </div>

      <Confirm
        open={confirmDiscard}
        title="Odrzucić trening?"
        message={`Wszystko, co wpisałeś w tym treningu (${totals.sets} ${plural(totals.sets, 'seria', 'serie', 'serii')}, ${fmtKg(totals.kg)}), zniknie. Tego nie da się cofnąć.`}
        confirmLabel="Odrzuć trening"
        danger
        onConfirm={discard}
        onClose={() => setConfirmDiscard(false)}
      />
    </Sheet>
  );
}
