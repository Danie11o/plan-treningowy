/** Liczby po polsku: przecinek, spacja co trzy cyfry, bez zbędnych zer. */

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(maxFraction: number): Intl.NumberFormat {
  let f = formatters.get(maxFraction);
  if (!f) {
    f = new Intl.NumberFormat('pl-PL', {
      maximumFractionDigits: maxFraction,
      // Polska norma nie grupuje liczb czterocyfrowych („8437"), ale obok
      // „12 437" wygląda to niekonsekwentnie — grupujemy zawsze.
      useGrouping: 'always',
    });
    formatters.set(maxFraction, f);
  }
  return f;
}

/** Usuwa szum zmiennoprzecinkowy (0,1 + 0,2), niczego nie zaokrąglając naprawdę. */
export function clean(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function fmtNum(n: number, maxFraction = 2): string {
  return formatter(maxFraction).format(clean(n));
}

export function fmtKg(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${fmtNum(n)} kg`;
}

/** Tony do sum z całej historii: 12 437,5 kg → „12,44". */
export function fmtTons(kg: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kg / 1000);
}

export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Wartość do pola tekstowego: 62.5 → „62,5". */
export function toField(n: number | null): string {
  return n === null ? '' : String(clean(n)).replace('.', ',');
}

/**
 * Odmiana przez liczebnik: plural(1, 'seria', 'serie', 'serii') → „seria",
 * 3 → „serie", 7 → „serii".
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.round(count));
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

export function fmtRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

/** Zapis jednej serii: „60 × 3", a bez ciężaru samo „3". */
export function fmtSet(weight: number | null, reps: number | null): string {
  if (reps === null) return '—';
  if (!weight) return `${reps}`;
  return `${fmtNum(weight)} × ${reps}`;
}
