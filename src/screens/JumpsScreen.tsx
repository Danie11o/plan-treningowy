import { useState } from 'react';
import { JUMPS, JUMPS_BY_ID, JUMP_GROUPS, LEVELS } from '../data/jumps';
import { updateActive, useActive } from '../store/store';
import { patchExercise } from '../lib/session';
import { currentEntry, goBack, navigate } from '../lib/router';
import { BackBar, Button, SectionTitle, showToast } from '../components/ui';
import { JumpFigure } from '../components/JumpFigure';
import { IconCheck, IconChevronRight, IconShield } from '../components/icons';

/**
 * Z treningu wchodzi się tu po wybór wariantu. Zapamiętujemy, z którego wpisu
 * historii przyszliśmy, żeby „Robię ten wariant" cofnęło prosto do serii,
 * zamiast dokładać kolejny ekran treningu na stos.
 */
let returnEntry: number | null = null;

export function openJumps(fromWorkout: boolean): void {
  returnEntry = fromWorkout ? currentEntry() : null;
  navigate('/skoki');
}

function returnToWorkout() {
  const here = currentEntry();
  if (returnEntry !== null && returnEntry < here) {
    const steps = returnEntry - here;
    returnEntry = null;
    history.go(steps);
  } else {
    navigate('/trening');
  }
}

function useWorkoutJump() {
  const active = useActive((s) => s.active);
  const index = active ? active.exercises.findIndex((e) => e.exerciseId === 'skoki') : -1;
  const variant = active && index >= 0 ? active.exercises[index].variant : null;
  return { active, index, variant };
}

export function JumpsScreen() {
  const { active, variant } = useWorkoutJump();

  return (
    <div data-day={active?.day ?? 'A'} className="min-h-dvh pb-10">
      <BackBar title="Warianty skoków" onBack={() => goBack('/plan')} />
      <p className="px-4 pt-4 text-[15px] leading-relaxed text-ash">
        Każdy pasuje do ćwiczenia „Skoki" z planu (3×3–5). Jakość ponad ilość — kończysz serię, gdy
        spada wysokość albo eksplozywność.
      </p>

      {JUMP_GROUPS.map((group) => {
        const list = JUMPS.filter((j) => j.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="mt-6 px-4">
            <p className="label mb-2.5 text-ash">{group}</p>
            <div className="space-y-2">
              {list.map((jump) => (
                <button
                  key={jump.id}
                  type="button"
                  onClick={() => navigate(`/skoki/${jump.id}`)}
                  className={`flex w-full items-center gap-3 rounded-card border bg-panel p-2 pr-3 text-left active:bg-raised ${
                    variant === jump.id ? 'border-day/60' : 'border-edge'
                  }`}
                >
                  <span className="shrink-0 overflow-hidden rounded-xl bg-night">
                    <JumpFigure jump={jump} still className="block h-[72px] w-[108px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] leading-snug font-semibold text-chalk">{jump.name}</span>
                      {variant === jump.id && (
                        <span className="label rounded-md bg-day px-1.5 py-[3px] text-[9px] text-day-ink">
                          dziś
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-ash">{jump.short}</span>
                    <Level level={jump.level} className="mt-1.5" />
                  </span>
                  <IconChevronRight className="size-5 shrink-0 text-dim" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Level({ level, className = '' }: { level: 1 | 2 | 3; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-3 rounded-full ${n <= level ? 'bg-day' : 'bg-edge'}`} />
        ))}
      </span>
      <span className="text-[12px] text-ash">{LEVELS[level]}</span>
    </span>
  );
}

export function JumpDetailScreen({ id }: { id: string }) {
  const jump = JUMPS_BY_ID[id];
  const { active, index, variant } = useWorkoutJump();
  const [paused, setPaused] = useState(false);

  if (!jump) {
    return (
      <div>
        <BackBar title="Skok" onBack={() => goBack('/skoki')} />
        <p className="px-4 pt-6 text-ash">Nie ma takiego wariantu.</p>
      </div>
    );
  }

  const chosen = variant === jump.id;
  const choose = () => {
    if (!chosen) {
      updateActive((s) => patchExercise(s, index, { variant: jump.id }));
      showToast('ok', `Dziś skaczesz: ${jump.name}`);
    }
    returnToWorkout();
  };

  return (
    <div data-day={active?.day ?? 'A'} className="min-h-dvh pb-10">
      <BackBar title={jump.name} onBack={() => goBack('/skoki')} />
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Wznów animację' : 'Zatrzymaj animację'}
          className="relative block w-full overflow-hidden rounded-[22px] border border-edge bg-panel"
        >
          <JumpFigure jump={jump} paused={paused} className="block w-full" />
          <span className="absolute right-3 bottom-3 rounded-md bg-night/80 px-2 py-1 text-[11px] text-ash">
            {paused ? 'pauza — dotknij, by wznowić' : 'dotknij, by zatrzymać'}
          </span>
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Level level={jump.level} />
          <span className="text-[14px] text-ash">
            Dawka: <span className="num text-[18px] text-chalk">{jump.dose}</span>
          </span>
        </div>
        <p className="mt-3 text-[16px] leading-relaxed text-chalk">{jump.short}</p>

        {index >= 0 && (
          <Button variant={chosen ? 'outline' : 'day'} size="lg" full className="mt-5" onClick={choose}>
            {chosen ? (
              <>
                <IconCheck className="size-5" />
                Już w dzisiejszym treningu — wróć
              </>
            ) : (
              'Robię ten wariant dziś'
            )}
          </Button>
        )}

        <section className="mt-8">
          <SectionTitle>Jak zrobić</SectionTitle>
          <ol className="space-y-3">
            {jump.how.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="num grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-[18px] text-day">
                  {i + 1}
                </span>
                <span className="pt-1 text-[15px] leading-relaxed text-chalk">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-7 grid gap-2">
          <div className="rounded-card border border-edge bg-panel p-4">
            <p className="label text-ash">Co to daje</p>
            <p className="mt-2 text-[15px] leading-relaxed text-chalk">{jump.gives}</p>
          </div>
          <div className="rounded-card border border-gold/30 bg-gold/[0.06] p-4">
            <p className="label flex items-center gap-1.5 text-gold">
              <IconShield className="size-4" />
              Uważaj
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-chalk">{jump.watch}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
