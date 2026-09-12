import type { DayKey, ExerciseInfo, PlanItem, Range, Settings } from '../lib/types';

/**
 * Plan z pliku plan_treningowy_AB.txt. Kolejność ma znaczenie — numery na
 * ekranie to kolejność robienia ćwiczeń, tak jak w pliku.
 *
 * Żeby coś zmienić w planie (serie, powtórzenia, uwagi), wystarczy poprawić
 * ten plik i wypchnąć zmiany na GitHuba — aplikacja zaktualizuje się sama.
 * Historia się nie rozjedzie: każdy trening trzyma kopię celu z tamtego dnia.
 */

const r = (min: number, max = min): Range => ({ min, max });

export const EXERCISES: Record<string, ExerciseInfo> = {
  rozgrzewka: {
    id: 'rozgrzewka',
    name: 'Rozgrzewka',
    kind: 'warmup',
    tag: 'Rozgrzewka',
  },
  'power-clean': {
    id: 'power-clean',
    name: 'Power clean',
    alias: 'zarzut siłowy',
    kind: 'weighted',
    tag: 'Moc',
    cue: 'Zawsze na początku, zaraz po rozgrzewce.',
  },
  'trap-bar': {
    id: 'trap-bar',
    name: 'Trap bar',
    alias: 'martwy ciąg z trap barem',
    kind: 'weighted',
    tag: 'Siła',
    cue: 'Główne ciężkie ćwiczenie siłowe.',
  },
  skoki: {
    id: 'skoki',
    name: 'Skoki',
    kind: 'jump',
    tag: 'Moc',
    cue: 'Na wysokiej jakości. Kończysz serię, gdy wyraźnie spada wysokość albo eksplozywność.',
  },
  bulgarian: {
    id: 'bulgarian',
    name: 'Bulgarian split squat',
    alias: 'bułgarski przysiad',
    kind: 'weighted',
    tag: 'Siła',
    perLeg: true,
    weightHint: 'Wpisuj łączny ciężar — 2 hantle po 20 kg to 40.',
    trimWhenTired: true,
  },
  rdl: {
    id: 'rdl',
    name: 'RDL',
    alias: 'rumuński martwy ciąg',
    kind: 'weighted',
    tag: 'Siła',
  },
  lydka: {
    id: 'lydka',
    name: 'Łydka',
    alias: 'wspięcia na palce',
    kind: 'weighted',
    tag: 'Akcesoria',
  },
  'szybkie-przysiady': {
    id: 'szybkie-przysiady',
    name: 'Szybkie przysiady',
    kind: 'weighted',
    tag: 'Moc',
    cue: 'Średni ciężar — priorytetem jest szybkość ruchu.',
  },
  'hip-thrust': {
    id: 'hip-thrust',
    name: 'Hip thrust',
    alias: 'wypychanie bioder',
    kind: 'weighted',
    tag: 'Siła',
  },
  'prostowanie-nog': {
    id: 'prostowanie-nog',
    name: 'Prostowanie nóg',
    alias: 'na maszynie',
    kind: 'weighted',
    tag: 'Akcesoria',
    trimWhenTired: true,
  },
};

export const PLAN: Record<DayKey, PlanItem[]> = {
  A: [
    { exerciseId: 'rozgrzewka', sets: r(0), reps: r(10, 15) },
    { exerciseId: 'power-clean', sets: r(4), reps: r(2, 3) },
    { exerciseId: 'trap-bar', sets: r(3), reps: r(3, 5) },
    { exerciseId: 'skoki', sets: r(3), reps: r(3, 5) },
    { exerciseId: 'bulgarian', sets: r(3), reps: r(5, 6), note: 'Na A ciężej niż na B.' },
    { exerciseId: 'rdl', sets: r(2, 3), reps: r(5, 8) },
    { exerciseId: 'lydka', sets: r(3), reps: r(6, 10) },
  ],
  B: [
    { exerciseId: 'rozgrzewka', sets: r(0), reps: r(10, 15) },
    { exerciseId: 'power-clean', sets: r(4), reps: r(2, 3) },
    { exerciseId: 'szybkie-przysiady', sets: r(3, 4), reps: r(3, 5) },
    { exerciseId: 'hip-thrust', sets: r(3), reps: r(4, 6) },
    { exerciseId: 'skoki', sets: r(3), reps: r(3, 5) },
    { exerciseId: 'bulgarian', sets: r(2, 3), reps: r(6), note: 'Na B lżej niż na A.' },
    { exerciseId: 'lydka', sets: r(3), reps: r(8, 12) },
    { exerciseId: 'prostowanie-nog', sets: r(2), reps: r(10, 15) },
  ],
};

/** Zasady z sekcji „Dodatkowe uwagi". */
export const RULES: { lead: string; text: string }[] = [
  { lead: 'Kolejność', text: 'Power clean zawsze na początku, po rozgrzewce.' },
  {
    lead: 'Skoki',
    text: 'Na wysokiej jakości — kończysz serię, gdy wyraźnie spada wysokość albo eksplozywność.',
  },
  { lead: 'Bułgary', text: 'Trening A ciężej, trening B lżej.' },
  { lead: 'Trap bar', text: 'Główne ciężkie ćwiczenie siłowe.' },
  { lead: 'Szybkie przysiady', text: 'Średni ciężar, priorytetem jest szybkość ruchu.' },
  {
    lead: 'W sezonie',
    text: 'Nie rób wszystkich ćwiczeń na maksa. Siłownia ma wspierać kosza, a nie zajeżdżać nóg.',
  },
  {
    lead: 'Zmęczone nogi',
    text: 'Jeśli po koszu nogi są mocno zmęczone, zmniejsz objętość akcesoriów — szczególnie bułgarów i prostowania.',
  },
];

/** Propozycja rozgrzewki — plik mówi tylko „10–15 min", więc to podpowiedź, nie wymóg. */
export const WARMUP_TIPS: string[] = [
  '5 min rower albo bieżnia na luzie',
  'Wymachy nóg, krążenia bioder, wykroki z rotacją',
  'Mostek biodrowy i wspięcia na palce — po 10',
  '2–3 serie podskoków i narastających wyskoków',
  'Pusty gryf: 1–2 lekkie serie power clean',
];

/**
 * Ćwiczenia, które są w obu dniach, ale z innym celem (bułgary, łydka).
 * Dla nich „ostatnio" i podpowiedzi ciężaru biorą się z tego samego dnia —
 * lżejsze bułgary z B nie mają podpowiadać ciężaru na A.
 */
export const SAME_DAY_HISTORY: Set<string> = (() => {
  const set = new Set<string>();
  for (const a of PLAN.A) {
    const b = PLAN.B.find((item) => item.exerciseId === a.exerciseId);
    if (!b) continue;
    const same =
      a.sets.min === b.sets.min &&
      a.sets.max === b.sets.max &&
      a.reps.min === b.reps.min &&
      a.reps.max === b.reps.max;
    if (!same) set.add(a.exerciseId);
  }
  return set;
})();

/** Wszystkie ćwiczenia z ciężarem w kolejności planu, bez powtórzeń — do listy rekordów. */
export const TRACKED_EXERCISES: string[] = (() => {
  const ids: string[] = [];
  for (const item of [...PLAN.A, ...PLAN.B]) {
    if (EXERCISES[item.exerciseId].kind === 'warmup') continue;
    if (!ids.includes(item.exerciseId)) ids.push(item.exerciseId);
  }
  return ids;
})();

export const DEFAULT_TRAINING_DAYS = [4, 6];

/** Plan z pliku z nałożonymi zmianami zrobionymi w aplikacji. */
export function planFor(day: DayKey, overrides: Settings['planOverrides']): PlanItem[] {
  return PLAN[day].map((item) => {
    const change = overrides?.[day]?.[item.exerciseId];
    if (!change) return item;
    return { ...item, sets: change.sets, reps: change.reps, weight: change.weight, edited: true };
  });
}
