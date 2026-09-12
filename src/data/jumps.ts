/**
 * Warianty ćwiczenia „Skoki" — opis i animacja.
 *
 * Animacja to sylwetka z odcinków (tułów, uda, łydki, ręce) ustawiana kątami.
 * Każdy skok to kilka póz na osi czasu 0..1; pomiędzy nimi ruch jest liczony.
 * Kąty w stopniach: 0 = prosto w dół, dodatnie = do przodu (w prawo),
 * 180 = prosto w górę. Tułów: 0 = pionowo, dodatnie = pochylony do przodu.
 * `foot` przykleja kostkę do punktu (stopa na ziemi albo na boxie),
 * `hip` ustawia biodro wprost (w locie). `air` rysuje tor lotu.
 */

export interface Pose {
  /** pochylenie tułowia */
  t: number;
  /** bliższa noga: udo, łydka, stopa (0 = płasko, dodatnie = palce w dół) */
  lt: number;
  ls: number;
  lf?: number;
  /** dalsza noga */
  rt: number;
  rs: number;
  rf?: number;
  /** bliższa ręka: ramię, przedramię */
  la: number;
  lb: number;
  /** dalsza ręka */
  ra: number;
  rb: number;
}

type Ease = 'lin' | 'in' | 'out' | 'io';

export interface Key {
  at: number;
  pose: Pose;
  hip?: [number, number];
  foot?: [number, number];
  footOf?: 'near' | 'far';
  /** wygładzenie ruchu w pionie / poziomie na odcinku kończącym się tą pozą */
  y?: Ease;
  x?: Ease;
  air?: boolean;
  fade?: number;
}

export type Prop =
  | { kind: 'box'; x: number; w: number; h: number }
  | { kind: 'bench'; x: number; w: number; h: number }
  | { kind: 'hurdle'; x: number; h: number }
  | { kind: 'hoop'; x: number; y: number }
  | { kind: 'mark'; x: number }
  | { kind: 'ball' }
  | { kind: 'trapbar' };

export type JumpGroup = 'Na skrzynię' | 'W górę' | 'Szybkie odbicie' | 'W dal' | 'Z obciążeniem';

export interface Jump {
  id: string;
  name: string;
  group: JumpGroup;
  level: 1 | 2 | 3;
  short: string;
  how: string[];
  gives: string;
  dose: string;
  watch: string;
  props: Prop[];
  keys: Key[];
  /** długość pętli w sekundach */
  duration: number;
  /** moment pętli pokazywany na miniaturze */
  still: number;
}

export const JUMP_GROUPS: JumpGroup[] = [
  'Na skrzynię',
  'W górę',
  'Szybkie odbicie',
  'W dal',
  'Z obciążeniem',
];

export const LEVELS: Record<1 | 2 | 3, string> = { 1: 'łatwy', 2: 'średni', 3: 'zaawansowany' };

/* ── Wymiary sylwetki (jednostki rysunku 240×160) ──────────────────────── */

export const GROUND = 146;
/** kostka stojącej stopy */
const FLAT = 143;
/** kostka przy wybiciu z palców */
const TOE = 137;

export const SEG = {
  thigh: 23,
  shin: 23,
  torso: 30,
  neck: 4,
  head: 7.5,
  upperArm: 16,
  forearm: 15,
  foot: 8,
};

const onBox = (h: number) => GROUND - h - 3;

/* ── Pozy bazowe ───────────────────────────────────────────────────────── */

const STAND: Pose = { t: 4, lt: 3, ls: 0, rt: -3, rs: -2, la: 8, lb: 16, ra: -6, rb: 2 };
/** zamach: ćwierćprzysiad, ręce w tył */
const LOAD: Pose = { t: 42, lt: 62, ls: -24, rt: 58, rs: -27, la: -58, lb: -38, ra: -64, rb: -46 };
/** wybicie: pełny wyprost, na palcach, ręce w górę */
const DRIVE: Pose = {
  t: 12, lt: 6, ls: -8, lf: 48, rt: 2, rs: -12, rf: 48, la: 152, lb: 166, ra: 142, rb: 158,
};
/** lot z kolanami w górze */
const TUCK: Pose = {
  t: 22, lt: 86, ls: -12, lf: 18, rt: 82, rs: -16, rf: 18, la: 98, lb: 122, ra: 90, rb: 114,
};
/** miękkie lądowanie */
const LAND: Pose = { t: 34, lt: 64, ls: -26, rt: 60, rs: -28, la: 72, lb: 98, ra: 64, rb: 90 };
/** zejście z krawędzi: bliższa noga wysunięta, dalsza jeszcze stoi */
const STEP_OFF: Pose = {
  t: 6, lt: 36, ls: 16, lf: -6, rt: 0, rs: 0, la: 20, lb: 40, ra: 10, rb: 30,
};
const DROP: Pose = {
  t: 8, lt: 10, ls: 2, lf: 30, rt: 6, rs: -2, rf: 30, la: 40, lb: 60, ra: 30, rb: 50,
};
/** krótki kontakt po zeskoku — płytko, ręce już w zamachu */
const AMORT: Pose = {
  t: 30, lt: 44, ls: -20, lf: 10, rt: 40, rs: -22, rf: 10, la: -40, lb: -20, ra: -46, rb: -28,
};

/** Wyskok na box z miejsca — ten sam szkielet w kilku wariantach. */
function boxJump(opts: {
  startX: number;
  landX: number;
  boxH: number;
  apex: [number, number];
  poses?: Partial<Record<'stand' | 'load' | 'drive' | 'tuck' | 'land', Pose>>;
}): Key[] {
  const p = { stand: STAND, load: LOAD, drive: DRIVE, tuck: TUCK, land: LAND, ...opts.poses };
  const top = onBox(opts.boxH);
  return [
    { at: 0, pose: p.stand, foot: [opts.startX, FLAT], fade: 0 },
    { at: 0.06, pose: p.stand, foot: [opts.startX, FLAT] },
    { at: 0.26, pose: p.load, foot: [opts.startX, FLAT] },
    { at: 0.36, pose: p.drive, foot: [opts.startX + 2, TOE] },
    { at: 0.5, pose: p.tuck, hip: opts.apex, y: 'out', x: 'lin', air: true },
    { at: 0.6, pose: p.land, foot: [opts.landX, top], y: 'in', x: 'lin', air: true },
    { at: 0.72, pose: p.stand, foot: [opts.landX, top] },
    { at: 0.88, pose: p.stand, foot: [opts.landX, top] },
    { at: 0.95, pose: p.stand, foot: [opts.landX, top], fade: 0 },
    { at: 1, pose: p.stand, foot: [opts.startX, FLAT], fade: 0 },
  ];
}

/* ── Warianty ──────────────────────────────────────────────────────────── */

const BALL_ARMS = { la: 34, lb: 128, ra: 40, rb: 132 };

const STEP_NEAR: Pose = {
  t: 10, lt: 26, ls: 6, lf: -8, rt: -24, rs: -44, rf: 34, la: -34, lb: -14, ra: 36, rb: 62,
};
const STEP_FAR: Pose = {
  t: 10, lt: -24, ls: -44, lf: 34, rt: 26, rs: 6, rf: -8, la: 36, lb: 62, ra: -34, rb: -14,
};

const SL_STAND: Pose = { t: 6, lt: 3, ls: 0, rt: 30, rs: -62, rf: 30, la: 10, lb: 20, ra: -8, rb: 0 };
const SL_LOAD: Pose = {
  t: 36, lt: 52, ls: -22, rt: 34, rs: -58, rf: 30, la: -50, lb: -30, ra: -56, rb: -40,
};
const SL_DRIVE: Pose = {
  t: 10, lt: 6, ls: -8, lf: 48, rt: 72, rs: -6, rf: 20, la: 140, lb: 160, ra: 110, rb: 130,
};
const SL_AIR: Pose = {
  t: 16, lt: 36, ls: -18, lf: 20, rt: 70, rs: -12, rf: 20, la: 90, lb: 110, ra: 80, rb: 100,
};
const SL_LAND: Pose = {
  t: 32, lt: 50, ls: -24, rt: 36, rs: -56, rf: 30, la: 62, lb: 88, ra: 54, rb: 80,
};

const PG_DOWN: Pose = {
  t: 3, lt: 8, ls: -4, lf: 30, rt: 4, rs: -6, rf: 30, la: 24, lb: 70, ra: 18, rb: 64,
};
const PG_UP: Pose = {
  t: 2, lt: 2, ls: 2, lf: 52, rt: -1, rs: 0, rf: 52, la: 30, lb: 80, ra: 24, rb: 72,
};

const KN_TALL: Pose = {
  t: 4, lt: 0, ls: -90, lf: 180, rt: -2, rs: -92, rf: 180, la: 20, lb: 40, ra: 14, rb: 34,
};
const KN_SWING: Pose = {
  t: 34, lt: 30, ls: -90, lf: 180, rt: 28, rs: -92, rf: 180, la: -60, lb: -40, ra: -66, rb: -48,
};
const KN_POP: Pose = {
  t: -4, lt: -6, ls: -70, lf: 160, rt: -8, rs: -74, rf: 160, la: 110, lb: 130, ra: 100, rb: 124,
};
const KN_TUCK: Pose = {
  t: 26, lt: 76, ls: -24, lf: 10, rt: 72, rs: -28, rf: 10, la: 88, lb: 104, ra: 80, rb: 96,
};
const SQUAT: Pose = { t: 44, lt: 78, ls: -32, rt: 74, rs: -34, la: 80, lb: 100, ra: 72, rb: 92 };

const REACH: Pose = {
  t: 6, lt: 8, ls: -6, lf: 50, rt: 4, rs: -10, rf: 50, la: 178, lb: 180, ra: 122, rb: 140,
};
const REACH_BOTH: Pose = {
  t: 4, lt: 4, ls: -4, lf: 50, rt: 2, rs: -8, rf: 50, la: 170, lb: 176, ra: 164, rb: 170,
};

const BR_DRIVE: Pose = {
  t: 34, lt: -14, ls: -22, lf: 54, rt: -18, rs: -26, rf: 54, la: 128, lb: 140, ra: 120, rb: 134,
};
const BR_AIR: Pose = {
  t: 20, lt: 62, ls: 6, lf: 0, rt: 58, rs: 2, rf: 0, la: 96, lb: 108, ra: 90, rb: 102,
};
const BR_LAND: Pose = { t: 40, lt: 76, ls: -18, rt: 72, rs: -20, la: 86, lb: 100, ra: 80, rb: 94 };

const HOP_GROUND: Pose = {
  t: 22, lt: 40, ls: -18, lf: 20, rt: 36, rs: -20, rf: 20, la: -26, lb: 10, ra: -32, rb: 4,
};
const HOP_TUCK: Pose = {
  t: 16, lt: 84, ls: -34, lf: 10, rt: 80, rs: -38, rf: 10, la: 70, lb: 96, ra: 62, rb: 88,
};

const SIT: Pose = { t: 8, lt: 86, ls: 2, rt: 83, rs: 0, la: 50, lb: 84, ra: 44, rb: 78 };
const SIT_SWING: Pose = {
  t: 34, lt: 84, ls: -4, rt: 81, rs: -6, la: -56, lb: -36, ra: -62, rb: -44,
};

const BAR = { la: 0, lb: 0, ra: -2, rb: -2 };

const LUNGE_A: Pose = {
  t: 6, lt: 70, ls: -4, rt: -26, rs: -84, rf: 40, la: -30, lb: -6, ra: 34, rb: 60,
};
const LUNGE_B: Pose = {
  t: 6, lt: -26, ls: -84, lf: 40, rt: 70, rs: -4, la: 34, lb: 60, ra: -30, rb: -6,
};
const SPLIT_AIR: Pose = {
  t: 4, lt: 22, ls: -14, lf: 40, rt: 8, rs: -26, rf: 40, la: 80, lb: 110, ra: 70, rb: 100,
};

export const JUMPS: Jump[] = [
  {
    id: 'box-z-miejsca',
    name: 'Z miejsca na boxa',
    group: 'Na skrzynię',
    level: 1,
    short: 'Podstawa. Wyskok obunóż z miejsca i miękkie lądowanie na skrzyni.',
    how: [
      'Stań pół kroku przed boxem, stopy na szerokość bioder.',
      'Szybki zamach rąk w tył i ćwierćprzysiad — bez zatrzymania na dole.',
      'Wybuchowo w górę: biodra, kolana, kostki i ręce w jednym momencie.',
      'Wyląduj cicho w półprzysiadzie, całymi stopami. Wstań i zejdź krokiem.',
    ],
    gives: 'Moc wyskoku bez obciążania stawów lądowaniem z wysoka.',
    dose: '3×3–5',
    watch:
      'Box ma być na tyle niski, żeby lądować w półprzysiadzie, a nie w głębokim przysiadzie. Z boxa schodź, nie zeskakuj.',
    props: [{ kind: 'box', x: 136, w: 50, h: 40 }],
    keys: boxJump({ startX: 70, landX: 160, boxH: 40, apex: [128, 62] }),
    duration: 2.6,
    still: 0.5,
  },
  {
    id: 'box-z-2-krokow',
    name: 'Z 2 kroków na boxa',
    group: 'Na skrzynię',
    level: 2,
    short: 'Dwa kroki rozbiegu i odbicie obunóż — jak najazd pod kosz.',
    how: [
      'Ustaw się dwa kroki przed boxem.',
      'Krok, potem drugi — dłuższy i niższy — i dostaw stopy do odbicia.',
      'Odbicie obunóż z zamachem rąk, kolana w górę nad krawędzią.',
      'Wyląduj miękko na całych stopach, zejdź krokiem.',
    ],
    gives: 'Zamienia prędkość rozbiegu na wysokość — najbliżej tego, co robisz na boisku.',
    dose: '3×3–4',
    watch: 'Rozbieg krótki, to nie sprint. Lądowanie nadal w półprzysiadzie, nie w głębokim.',
    props: [{ kind: 'box', x: 150, w: 50, h: 40 }],
    keys: [
      { at: 0, pose: STAND, foot: [22, FLAT], fade: 0 },
      { at: 0.05, pose: STAND, foot: [22, FLAT] },
      { at: 0.17, pose: STEP_FAR, foot: [50, FLAT], footOf: 'far' },
      { at: 0.29, pose: STEP_NEAR, foot: [84, FLAT] },
      { at: 0.37, pose: LOAD, foot: [90, FLAT] },
      { at: 0.45, pose: DRIVE, foot: [92, TOE] },
      { at: 0.57, pose: TUCK, hip: [146, 60], y: 'out', x: 'lin', air: true },
      { at: 0.66, pose: LAND, foot: [176, onBox(40)], y: 'in', x: 'lin', air: true },
      { at: 0.76, pose: STAND, foot: [176, onBox(40)] },
      { at: 0.9, pose: STAND, foot: [176, onBox(40)] },
      { at: 0.96, pose: STAND, foot: [176, onBox(40)], fade: 0 },
      { at: 1, pose: STAND, foot: [22, FLAT], fade: 0 },
    ],
    duration: 2.9,
    still: 0.57,
  },
  {
    id: 'box-z-pilka',
    name: 'Z piłką na boxa',
    group: 'Na skrzynię',
    level: 1,
    short: 'Wyskok na box z piłką lekarską albo do kosza trzymaną oburącz.',
    how: [
      'Trzymaj piłkę przy klatce: lekarską 2–4 kg albo piłkę do kosza.',
      'W zamachu opuść piłkę do bioder i zejdź w ćwierćprzysiad.',
      'Wyskakując, wypchnij piłkę w górę, w locie przyciągnij ją do klatki.',
      'Wyląduj stabilnie z piłką przy sobie.',
    ],
    gives: 'Skok z zajętymi rękami i kontrolą tułowia — jak przy zbiórce albo wsadzie.',
    dose: '3×3–5',
    watch: 'Lżejsza piłka to szybszy ruch. Jeśli wysokość wyraźnie spada — odłóż piłkę.',
    props: [{ kind: 'box', x: 136, w: 50, h: 40 }, { kind: 'ball' }],
    keys: boxJump({
      startX: 70,
      landX: 160,
      boxH: 40,
      apex: [128, 62],
      poses: {
        stand: { ...STAND, ...BALL_ARMS },
        load: { ...LOAD, la: 12, lb: 36, ra: 16, rb: 40 },
        drive: { ...DRIVE, la: 128, lb: 150, ra: 124, rb: 146 },
        tuck: { ...TUCK, la: 44, lb: 124, ra: 50, rb: 128 },
        land: { ...LAND, la: 40, lb: 118, ra: 46, rb: 122 },
      },
    }),
    duration: 2.6,
    still: 0.5,
  },
  {
    id: 'jedna-noga-na-podest',
    name: 'Jedną nogą na podest',
    group: 'Na skrzynię',
    level: 2,
    short: 'Odbicie z jednej nogi na niski stopień i lądowanie na tej samej nodze.',
    how: [
      'Stań na jednej nodze przed niskim podestem (20–40 cm).',
      'Zamach rąk i krótkie ugięcie nogi odbijającej.',
      'Wybij się w górę i w przód, wolne kolano podciągnij.',
      'Wyląduj na tej samej nodze i utrzymaj 2 sekundy. Potem druga noga.',
    ],
    gives: 'Siła i stabilność jednej nogi — w meczu większość wyskoków jest z jednej nogi.',
    dose: '3×3 na nogę',
    watch: 'Przy lądowaniu kolano nad stopą, nie ucieka do środka. Podest niski — liczy się kontrola.',
    props: [{ kind: 'box', x: 104, w: 56, h: 22 }],
    keys: [
      { at: 0, pose: SL_STAND, foot: [64, FLAT], fade: 0 },
      { at: 0.06, pose: SL_STAND, foot: [64, FLAT] },
      { at: 0.24, pose: SL_LOAD, foot: [64, FLAT] },
      { at: 0.34, pose: SL_DRIVE, foot: [66, TOE] },
      { at: 0.46, pose: SL_AIR, hip: [104, 72], y: 'out', x: 'lin', air: true },
      { at: 0.56, pose: SL_LAND, foot: [130, onBox(22)], y: 'in', x: 'lin', air: true },
      { at: 0.68, pose: SL_LAND, foot: [130, onBox(22)] },
      { at: 0.78, pose: SL_STAND, foot: [130, onBox(22)] },
      { at: 0.9, pose: SL_STAND, foot: [130, onBox(22)] },
      { at: 0.96, pose: SL_STAND, foot: [130, onBox(22)], fade: 0 },
      { at: 1, pose: SL_STAND, foot: [64, FLAT], fade: 0 },
    ],
    duration: 2.8,
    still: 0.46,
  },
  {
    id: 'z-siadu-na-boxa',
    name: 'Z siadu na boxa',
    group: 'Na skrzynię',
    level: 1,
    short: 'Start z ławki: bez zamachu nóg, czysta moc bioder.',
    how: [
      'Usiądź na ławce, stopy płasko, kolana mniej więcej pod kątem prostym.',
      'Zamach rąk w tył, tułów lekko w przód.',
      'Z siadu prosto w wyskok na box.',
      'Miękkie lądowanie, wstań, zejdź krokiem.',
    ],
    gives: 'Wyłącza sprężyste odbicie — trenuje czystą siłę startową.',
    dose: '3×3–4',
    watch: 'Nie bujaj się na ławce, żeby nabrać rozpędu — jeden zamach rąk i start.',
    props: [
      { kind: 'bench', x: 26, w: 46, h: 25 },
      { kind: 'box', x: 148, w: 50, h: 40 },
    ],
    keys: [
      { at: 0, pose: SIT, hip: [54, 118], fade: 0 },
      { at: 0.06, pose: SIT, hip: [54, 118] },
      { at: 0.22, pose: SIT_SWING, hip: [55, 118] },
      { at: 0.34, pose: DRIVE, foot: [80, TOE], y: 'out' },
      { at: 0.48, pose: TUCK, hip: [138, 60], y: 'out', x: 'lin', air: true },
      { at: 0.58, pose: LAND, foot: [172, onBox(40)], y: 'in', x: 'lin', air: true },
      { at: 0.7, pose: STAND, foot: [172, onBox(40)] },
      { at: 0.88, pose: STAND, foot: [172, onBox(40)] },
      { at: 0.95, pose: STAND, foot: [172, onBox(40)], fade: 0 },
      { at: 1, pose: SIT, hip: [54, 118], fade: 0 },
    ],
    duration: 2.7,
    still: 0.48,
  },
  {
    id: 'zeskok-i-wskok',
    name: 'Zeskok ze stopnia i wskok na boxa',
    group: 'Na skrzynię',
    level: 3,
    short: 'Zejdź ze stopnia, a zaraz po lądowaniu wybij się na box.',
    how: [
      'Stań na niskim stopniu (20–30 cm). Box stoi ok. 1 m dalej.',
      'Zrób krok w przód — nie skacz, po prostu spadnij z krawędzi.',
      'Wyląduj obunóż na przodzie stóp i od razu, bez zatrzymania, odbij się na box.',
      'Kontakt z ziemią ma być krótki, jak odbicie od gorącej blachy.',
    ],
    gives:
      'Uczy wykorzystać sprężystość ścięgien: szybkie odbicie tuż po lądowaniu, jak przy dobitce.',
    dose: '3×3, pełna przerwa',
    watch:
      'Tylko na świeżych nogach, na początku skoków. Jeśli pięty uderzają o ziemię albo odbicie jest wolne — stopień jest za wysoki.',
    props: [
      { kind: 'box', x: 0, w: 46, h: 26 },
      { kind: 'box', x: 152, w: 50, h: 40 },
    ],
    keys: [
      { at: 0, pose: STAND, foot: [28, onBox(26)], fade: 0 },
      { at: 0.05, pose: STAND, foot: [28, onBox(26)] },
      { at: 0.15, pose: STEP_OFF, foot: [30, onBox(26)], footOf: 'far' },
      { at: 0.24, pose: DROP, hip: [52, 84], y: 'in', x: 'lin', air: true },
      { at: 0.3, pose: AMORT, foot: [70, FLAT], y: 'lin', x: 'lin', air: true },
      { at: 0.36, pose: DRIVE, foot: [72, TOE] },
      { at: 0.49, pose: TUCK, hip: [130, 60], y: 'out', x: 'lin', air: true },
      { at: 0.59, pose: LAND, foot: [178, onBox(40)], y: 'in', x: 'lin', air: true },
      { at: 0.7, pose: STAND, foot: [178, onBox(40)] },
      { at: 0.88, pose: STAND, foot: [178, onBox(40)] },
      { at: 0.95, pose: STAND, foot: [178, onBox(40)], fade: 0 },
      { at: 1, pose: STAND, foot: [28, onBox(26)], fade: 0 },
    ],
    duration: 3,
    still: 0.49,
  },
  {
    id: 'do-celu',
    name: 'Wyskok do celu',
    group: 'W górę',
    level: 1,
    short: 'Wyskok z miejsca z sięgnięciem celu — obręcz, siatka, znacznik na ścianie.',
    how: [
      'Wybierz cel lekko poza zasięgiem: siatkę, obręcz, taśmę na ścianie.',
      'Zamach rąk, ćwierćprzysiad, wyskok.',
      'Sięgnij celu jedną ręką w najwyższym punkcie lotu.',
      'Wyląduj miękko na obie nogi.',
    ],
    gives: 'Cel nad głową sprawia, że skaczesz naprawdę na maksa, a postęp widać od razu.',
    dose: '3×3–5',
    watch: 'Każdy skok na 100%. Jeśli przestajesz sięgać celu — kończ serię.',
    props: [{ kind: 'hoop', x: 106, y: 15 }],
    keys: [
      { at: 0, pose: STAND, foot: [104, FLAT] },
      { at: 0.2, pose: LOAD, foot: [104, FLAT] },
      { at: 0.3, pose: DRIVE, foot: [106, TOE] },
      { at: 0.44, pose: REACH, hip: [107, 70], y: 'out', x: 'lin' },
      { at: 0.58, pose: LAND, foot: [106, FLAT], y: 'in', x: 'lin' },
      { at: 0.76, pose: STAND, foot: [104, FLAT] },
      { at: 1, pose: STAND, foot: [104, FLAT] },
    ],
    duration: 2.3,
    still: 0.44,
  },
  {
    id: 'z-kleczenia',
    name: 'Z klęczenia',
    group: 'W górę',
    level: 2,
    short: 'Z klęku wyskok do przysiadu — cała moc idzie z bioder.',
    how: [
      'Klęknij na macie, grzbiety stóp na ziemi.',
      'Usiądź lekko w stronę pięt, ręce w tył.',
      'Mocny zamach rąk w przód i wypchnięcie bioder — wyskocz z kolan na stopy.',
      'Wyląduj w przysiadzie i wstań. Wersja trudniejsza: od razu wyskok w górę.',
    ],
    gives: 'Najczystszy trening wyprostu bioder — łydki i kostki nic tu nie pomagają.',
    dose: '3×3–5',
    watch: 'Mata pod kolana. Ląduj na całych stopach, nie na palcach.',
    props: [],
    keys: [
      { at: 0, pose: KN_TALL, hip: [84, 119], fade: 0 },
      { at: 0.06, pose: KN_TALL, hip: [84, 119] },
      { at: 0.22, pose: KN_SWING, hip: [72.5, 122] },
      { at: 0.32, pose: KN_POP, hip: [86, 110], y: 'out' },
      { at: 0.4, pose: KN_TUCK, hip: [94, 102], y: 'out', air: true },
      { at: 0.48, pose: SQUAT, foot: [108, FLAT], y: 'in', air: true },
      { at: 0.64, pose: STAND, foot: [108, FLAT] },
      { at: 0.86, pose: STAND, foot: [108, FLAT] },
      { at: 0.94, pose: STAND, foot: [108, FLAT], fade: 0 },
      { at: 1, pose: KN_TALL, hip: [84, 119], fade: 0 },
    ],
    duration: 2.6,
    still: 0.4,
  },
  {
    id: 'wykroki-w-wyskoku',
    name: 'Wyskoki w wykroku',
    group: 'W górę',
    level: 2,
    short: 'Wykrok, wyskok i zmiana nóg w powietrzu.',
    how: [
      'Zacznij w wykroku, tylne kolano nisko nad ziemią.',
      'Wyskocz w górę i w locie zamień nogi.',
      'Wyląduj miękko w wykroku na drugą nogę.',
      'Każda zmiana to jedno powtórzenie.',
    ],
    gives: 'Moc jednej nogi i koordynacja — blisko pracy nóg przy biegu i odbiciu.',
    dose: '3×4–6 na nogę',
    watch: 'Przednie kolano nad stopą. Jeśli lądowania robią się głośne — przerwij serię.',
    props: [],
    keys: [
      { at: 0, pose: LUNGE_A, foot: [120, FLAT] },
      { at: 0.1, pose: { ...LUNGE_A, lt: 76, ls: -8, rt: -20, rs: -88 }, foot: [120, FLAT] },
      { at: 0.22, pose: SPLIT_AIR, hip: [101, 88], y: 'out' },
      { at: 0.34, pose: LUNGE_B, foot: [120, FLAT], footOf: 'far', y: 'in' },
      { at: 0.5, pose: LUNGE_B, foot: [120, FLAT], footOf: 'far' },
      {
        at: 0.6,
        pose: { ...LUNGE_B, rt: 76, rs: -8, lt: -20, ls: -88 },
        foot: [120, FLAT],
        footOf: 'far',
      },
      {
        at: 0.72,
        pose: { ...SPLIT_AIR, lt: 8, ls: -26, rt: 22, rs: -14 },
        hip: [101, 88],
        y: 'out',
      },
      { at: 0.84, pose: LUNGE_A, foot: [120, FLAT], y: 'in' },
      { at: 1, pose: LUNGE_A, foot: [120, FLAT] },
    ],
    duration: 2.4,
    still: 0.22,
  },
  {
    id: 'pogo',
    name: 'Pogo jumps',
    group: 'Szybkie odbicie',
    level: 1,
    short: 'Szybkie, niskie podskoki na sztywnych kostkach.',
    how: [
      'Stań prosto, ciężar na przodzie stóp, ręce luźno ugięte.',
      'Podskakuj rytmicznie, prawie bez zginania kolan — pracują kostki.',
      'Pięty nie dotykają ziemi, kontakt jak najkrótszy.',
      'Seria to 10–20 odbić albo 10–15 sekund.',
    ],
    gives: 'Sprężystość łydek i ścięgna Achillesa — szybsze odbicie w każdym skoku.',
    dose: '3×10–20 odbić',
    watch: 'Świetne na koniec rozgrzewki. Jeśli boli Achilles — odpuść.',
    props: [],
    keys: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      n % 2 === 0
        ? { at: n / 8, pose: PG_DOWN, foot: [120, 139] as [number, number], y: 'in' as const }
        : { at: n / 8, pose: PG_UP, hip: [118.6, 77] as [number, number], y: 'out' as const },
    ),
    duration: 1.6,
    still: 0.125,
  },
  {
    id: 'plotki',
    name: 'Przeskoki przez płotki',
    group: 'Szybkie odbicie',
    level: 2,
    short: 'Seria odbić obunóż przez niskie płotki, bez zatrzymania.',
    how: [
      'Ustaw 3–5 niskich płotków (15–40 cm) co ok. 1 m.',
      'Przeskakuj obunóż, kolana w górę nad płotkiem.',
      'Między płotkami tylko krótki kontakt z ziemią, ręce pomagają.',
      'Po ostatnim płotku wyląduj stabilnie.',
    ],
    gives: 'Szybkie, powtarzane odbicia — jak kilka skoków pod koszem pod rząd.',
    dose: '3×4–5 płotków',
    watch: 'Lepiej niższe płotki i szybkie odbicie niż wysokie i ciężkie lądowania.',
    props: [
      { kind: 'hurdle', x: 76, h: 18 },
      { kind: 'hurdle', x: 128, h: 18 },
      { kind: 'hurdle', x: 180, h: 18 },
    ],
    keys: [
      { at: 0, pose: HOP_GROUND, foot: [40, 140], fade: 0 },
      { at: 0.05, pose: HOP_GROUND, foot: [40, 140] },
      { at: 0.15, pose: HOP_TUCK, hip: [70, 88], y: 'out', x: 'lin', air: true },
      { at: 0.25, pose: HOP_GROUND, foot: [104, 140], y: 'in', x: 'lin', air: true },
      { at: 0.35, pose: HOP_TUCK, hip: [122, 88], y: 'out', x: 'lin', air: true },
      { at: 0.45, pose: HOP_GROUND, foot: [156, 140], y: 'in', x: 'lin', air: true },
      { at: 0.55, pose: HOP_TUCK, hip: [174, 88], y: 'out', x: 'lin', air: true },
      { at: 0.65, pose: HOP_GROUND, foot: [208, 140], y: 'in', x: 'lin', air: true },
      { at: 0.76, pose: STAND, foot: [208, FLAT] },
      { at: 0.88, pose: STAND, foot: [208, FLAT] },
      { at: 0.95, pose: STAND, foot: [208, FLAT], fade: 0 },
      { at: 1, pose: HOP_GROUND, foot: [40, 140], fade: 0 },
    ],
    duration: 2.8,
    still: 0.35,
  },
  {
    id: 'depth-jump',
    name: 'Depth jump',
    group: 'Szybkie odbicie',
    level: 3,
    short: 'Zeskok ze skrzyni i natychmiastowy wyskok w górę na maksa.',
    how: [
      'Stań na boxie 30–45 cm.',
      'Zrób krok w przód i spadnij — nie wyskakuj z boxa w górę.',
      'Wyląduj obunóż i od razu wybij się jak najwyżej.',
      'Drugie lądowanie miękko, w półprzysiadzie.',
    ],
    gives: 'Najmocniejszy bodziec dla szybkiego odbicia. Dla zaawansowanych.',
    dose: '2–3×3, długa przerwa',
    watch:
      'Tylko przy dobrej technice lądowania i świeżych nogach. W sezonie mało powtórzeń — to bardzo obciąża ścięgna.',
    props: [{ kind: 'box', x: 20, w: 50, h: 40 }],
    keys: [
      { at: 0, pose: STAND, foot: [44, onBox(40)], fade: 0 },
      { at: 0.05, pose: STAND, foot: [44, onBox(40)] },
      { at: 0.14, pose: STEP_OFF, foot: [46, onBox(40)], footOf: 'far' },
      { at: 0.23, pose: DROP, hip: [76, 74], y: 'in', x: 'lin', air: true },
      { at: 0.29, pose: AMORT, foot: [96, FLAT], y: 'lin', x: 'lin', air: true },
      { at: 0.34, pose: DRIVE, foot: [98, TOE] },
      { at: 0.47, pose: REACH_BOTH, hip: [100, 62], y: 'out', x: 'lin' },
      { at: 0.6, pose: LAND, foot: [102, FLAT], y: 'in', x: 'lin' },
      { at: 0.74, pose: STAND, foot: [102, FLAT] },
      { at: 0.88, pose: STAND, foot: [102, FLAT] },
      { at: 0.95, pose: STAND, foot: [102, FLAT], fade: 0 },
      { at: 1, pose: STAND, foot: [44, onBox(40)], fade: 0 },
    ],
    duration: 2.9,
    still: 0.47,
  },
  {
    id: 'w-dal-z-miejsca',
    name: 'Skok w dal z miejsca',
    group: 'W dal',
    level: 1,
    short: 'Obunóż jak najdalej do przodu i stabilne lądowanie.',
    how: [
      'Stopy na szerokość bioder, palce przy linii.',
      'Zamach rąk w tył i ugięcie nóg.',
      'Wybicie w przód i w górę, mniej więcej pod kątem 45°, ręce do przodu.',
      'Wyląduj w przysiadzie i utrzymaj pozycję — bez kroku w przód.',
    ],
    gives: 'Moc w poziomie — przydaje się w pierwszym kroku i starcie do piłki.',
    dose: '3×3–5',
    watch: 'Liczy się tylko skok z utrzymanym lądowaniem. Możesz mierzyć odległość i wpisać ją w notatce.',
    props: [
      { kind: 'mark', x: 38 },
      { kind: 'mark', x: 186 },
    ],
    keys: [
      { at: 0, pose: STAND, foot: [30, FLAT], fade: 0 },
      { at: 0.06, pose: STAND, foot: [30, FLAT] },
      { at: 0.24, pose: LOAD, foot: [30, FLAT] },
      { at: 0.33, pose: BR_DRIVE, foot: [34, TOE] },
      { at: 0.46, pose: BR_AIR, hip: [104, 74], y: 'out', x: 'lin', air: true },
      { at: 0.58, pose: BR_LAND, foot: [176, FLAT], y: 'in', x: 'lin', air: true },
      { at: 0.72, pose: STAND, foot: [176, FLAT] },
      { at: 0.88, pose: STAND, foot: [176, FLAT] },
      { at: 0.95, pose: STAND, foot: [176, FLAT], fade: 0 },
      { at: 1, pose: STAND, foot: [30, FLAT], fade: 0 },
    ],
    duration: 2.6,
    still: 0.46,
  },
  {
    id: 'trap-bar-jump',
    name: 'Skoki z trap barem',
    group: 'Z obciążeniem',
    level: 2,
    short: 'Wyskok z lekkim trap barem w rękach — moc pod obciążeniem.',
    how: [
      'Weź lekki trap bar: 20–30% tego, co robisz w martwym ciągu.',
      'Ćwierćprzysiad, plecy proste, ręce proste.',
      'Wyskocz wybuchowo w górę, gryf zostaje przy biodrach.',
      'Wyląduj miękko, zatrzymaj się i dopiero wtedy kolejne powtórzenie.',
    ],
    gives: 'Most między siłą a skocznością — wybuchowość z ciężarem w rękach.',
    dose: '3×3–5',
    watch:
      'Lekko! Jeśli skok jest niski i wolny, zmniejsz ciężar. Ciężar wpisz w serii — liczy się do rekordów.',
    props: [{ kind: 'trapbar' }],
    keys: [
      { at: 0, pose: { ...STAND, ...BAR }, foot: [110, FLAT] },
      { at: 0.22, pose: { ...LOAD, t: 30, lt: 50, ls: -22, rt: 47, rs: -24, ...BAR }, foot: [110, FLAT] },
      { at: 0.32, pose: { ...DRIVE, t: 6, ...BAR }, foot: [111, TOE] },
      { at: 0.44, pose: { ...DRIVE, t: 6, lt: 10, ls: -4, rt: 6, rs: -8, ...BAR }, hip: [112, 76], y: 'out' },
      { at: 0.56, pose: { ...LOAD, t: 30, lt: 50, ls: -22, rt: 47, rs: -24, ...BAR }, foot: [111, FLAT], y: 'in' },
      { at: 0.74, pose: { ...STAND, ...BAR }, foot: [110, FLAT] },
      { at: 1, pose: { ...STAND, ...BAR }, foot: [110, FLAT] },
    ],
    duration: 2.3,
    still: 0.44,
  },
];

export const JUMPS_BY_ID: Record<string, Jump> = Object.fromEntries(JUMPS.map((j) => [j.id, j]));
