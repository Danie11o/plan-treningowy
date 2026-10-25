export type ScheduledDay = 'A' | 'B';
export type DayKey = ScheduledDay | 'C';

export type ExerciseKind = 'warmup' | 'weighted' | 'jump';

/** Po co jest ćwiczenie — widać to na plakietce przy nazwie. */
export type Tag = 'Rozgrzewka' | 'Moc' | 'Siła' | 'Akcesoria' | 'Stabilizacja';

export interface Range {
  min: number;
  max: number;
}

export interface ExerciseInfo {
  id: string;
  name: string;
  /** Polska nazwa albo doprecyzowanie, drobnym drukiem pod nazwą. */
  alias?: string;
  kind: ExerciseKind;
  tag: Tag;
  /** Powtórzenia liczone na nogę — do sum liczą się podwójnie. */
  perLeg?: boolean;
  /** Powtórzenia na stronę — sumy obejmują obie strony. */
  perSide?: boolean;
  /** Uwaga wspólna dla A i B. */
  cue?: string;
  /** Jak wpisywać ciężar, jeśli nie jest to oczywiste. */
  weightHint?: string;
  /** Przy zmęczonych nogach po koszu to ćwiczenie tnie się jako pierwsze. */
  trimWhenTired?: boolean;
}

export interface PlanItem {
  exerciseId: string;
  sets: Range;
  /** Dla rozgrzewki: minuty. */
  reps: Range;
  /** Uwaga tylko dla tego dnia. */
  note?: string;
  /** Ciężar wpisany w planie — podpowiada się na treningu. */
  weight?: number | null;
  /** Zmienione ręcznie względem pliku z planem. */
  edited?: boolean;
}

/** Ręczna zmiana jednego ćwiczenia w planie. */
export interface PlanOverride {
  sets: Range;
  reps: Range;
  weight: number | null;
}

export interface SetEntry {
  id: string;
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** Seria z górnej części zakresu, np. trzecia przy „2–3 serie". */
  optional: boolean;
  doneAt: number | null;
}

export interface SessionExercise {
  exerciseId: string;
  /** Kopia celu z planu z dnia treningu — historia nie zmienia się razem z planem. */
  target: { sets: Range; reps: Range; weight?: number | null };
  sets: SetEntry[];
  /** Wybrany wariant skoku. */
  variant: string | null;
  note: string;
}

export interface Session {
  id: string;
  day: DayKey;
  startedAt: number;
  finishedAt: number | null;
  warmupDone: boolean;
  exercises: SessionExercise[];
  updatedAt: number;
}

export interface Settings {
  /** Dni tygodnia jak w Date.getDay(): 0 = niedziela, 4 = czwartek, 6 = sobota. */
  trainingDays: number[];
  lastBackupAt: number | null;
  /** Zmiany planu zrobione w aplikacji, na wierzchu planu z pliku. */
  planOverrides?: Partial<Record<DayKey, Record<string, PlanOverride>>>;
}
