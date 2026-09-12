export const DAY_NAMES = [
  'niedziela',
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
];

export const DAY_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

/** W tej kolejności pokazujemy tydzień — od poniedziałku. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const DAY_MS = 86_400_000;

export function startOfDay(ts: number | Date): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: number | Date, b: number | Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Różnica w dniach kalendarzowych, odporna na zmianę czasu. */
export function daysBetween(from: number | Date, to: number | Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** „czwartek, 17 września" */
export function formatLongDate(ts: number | Date): string {
  const d = new Date(ts);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** „17 wrz", a z innego roku „17 wrz 2025". */
export function formatShortDate(ts: number | Date): string {
  const d = new Date(ts);
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function formatMonth(ts: number | Date): string {
  const d = new Date(ts);
  const names = [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ];
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

/** „dziś", „wczoraj", „3 dni temu", dalej data. */
export function formatRelativeDay(ts: number): string {
  const diff = daysBetween(ts, Date.now());
  if (diff === 0) return 'dziś';
  if (diff === 1) return 'wczoraj';
  if (diff > 1 && diff < 7) return `${diff} dni temu`;
  return formatShortDate(ts);
}

/** „za 2 dni", „jutro", „dziś". */
export function formatIn(date: Date): string {
  const diff = daysBetween(Date.now(), date);
  if (diff <= 0) return 'dziś';
  if (diff === 1) return 'jutro';
  return `za ${diff} dni`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Zegar: „58:12" albo „1:12:04". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Czas treningu co do sekundy: „1 h 12 min 4 s". */
export function formatDuration(ms: number, withSeconds = true): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (h || m) parts.push(`${m} min`);
  if (withSeconds && (s || !parts.length)) parts.push(`${s} s`);
  if (!parts.length) parts.push('0 min');
  return parts.join(' ');
}
