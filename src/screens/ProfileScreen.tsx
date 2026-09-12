import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { EXERCISES, TRACKED_EXERCISES } from '../data/plan';
import {
  markBackupDone,
  mergePlanOverrides,
  mergeSessions,
  setTrainingDays,
  useLog,
} from '../store/store';
import { counts, lifetime, recordTimeline } from '../lib/stats';
import {
  canShareFiles,
  downloadBackup,
  parseBackup,
  shareBackup,
  type ParsedBackup,
} from '../lib/backup';
import { navigate } from '../lib/router';
import {
  DAY_SHORT,
  WEEK_ORDER,
  daysBetween,
  formatDuration,
  formatLongDate,
  formatRelativeDay,
  formatShortDate,
} from '../lib/date';
import { fmtKg, fmtNum, fmtTons, plural } from '../lib/format';
import type { Session } from '../lib/types';
import { Button, Confirm, ScreenTitle, SectionTitle, showToast } from '../components/ui';
import {
  IconChevronRight,
  IconDownload,
  IconShare,
  IconShield,
  IconUpload,
} from '../components/icons';

export function ProfileScreen() {
  const sessions = useLog((s) => s.sessions);
  const settings = useLog((s) => s.settings);
  const life = useMemo(() => lifetime(sessions), [sessions]);

  return (
    <div>
      <ScreenTitle
        eyebrow={life.first ? `liczone od ${formatLongDate(life.first)}` : 'Twoje liczby'}
        title="Profil"
      />

      {/* ── Łącznie ─────────────────────────────────────────────────── */}
      <section className="px-4">
        <div className="relative overflow-hidden rounded-[26px] border border-edge bg-panel p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-a/15 blur-3xl"
          />
          <p className="label relative text-ash">Podniesione łącznie</p>
          <p className="num relative mt-3 text-[72px] leading-[0.8] text-chalk">
            {fmtTons(life.kg)}
            <span className="ml-2 font-sans text-[22px] font-medium text-ash">t</span>
          </p>
          <p className="relative mt-3 text-[14px] text-ash">
            {life.sessions ? `dokładnie ${fmtKg(life.kg)}` : 'Licznik ruszy po pierwszym treningu.'}
          </p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Tile label="Powtórzenia" value={fmtNum(life.reps)} />
          <Tile label="Serie" value={fmtNum(life.sets)} />
          <Tile
            label="Treningi"
            value={String(life.sessions)}
            caption={life.sessions ? `A: ${life.a} · B: ${life.b}` : undefined}
          />
          <Tile
            label="Czas na siłowni"
            value={life.ms ? formatDuration(life.ms, false) : '0 min'}
            small
          />
        </div>
      </section>

      <RecordsSection sessions={sessions} />

      {/* ── Dni treningowe ──────────────────────────────────────────── */}
      <section className="mt-8 px-4">
        <SectionTitle aside="A i B na zmianę">Dni treningowe</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_ORDER.map((d) => {
            const on = settings.trainingDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setTrainingDays(
                    on ? settings.trainingDays.filter((x) => x !== d) : [...settings.trainingDays, d],
                  )
                }
                className={`h-12 rounded-xl border text-[14px] font-medium transition-colors ${
                  on ? 'border-a bg-a/15 text-chalk' : 'border-edge text-ash active:bg-panel'
                }`}
              >
                {DAY_SHORT[d]}
              </button>
            );
          })}
        </div>
      </section>

      <BackupSection lastBackupAt={settings.lastBackupAt} count={sessions.length} />

      <p className="mx-4 mt-8 flex gap-2.5 text-[13px] leading-relaxed text-dim">
        <IconShield className="mt-0.5 size-4 shrink-0" />
        Wszystko zapisuje się tylko na tym telefonie. Aplikacja niczego nie wysyła, nie ma kont ani
        reklam i działa bez internetu.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  caption,
  small,
}: {
  label: string;
  value: string;
  caption?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-edge bg-panel px-4 py-3.5">
      <p className="label text-[10px] text-ash">{label}</p>
      <p className={`num mt-2 ${small ? 'text-[24px]' : 'text-[30px]'} text-chalk`}>{value}</p>
      {caption && <p className="mt-1 text-[12px] text-dim">{caption}</p>}
    </div>
  );
}

/* ── Rekordy ───────────────────────────────────────────────────────────── */

function RecordsSection({ sessions }: { sessions: Session[] }) {
  const rows = useMemo(
    () =>
      TRACKED_EXERCISES.map((id) => {
        const timeline = recordTimeline(sessions, id);
        const times = sessions.filter((s) =>
          s.exercises.some((e) => e.exerciseId === id && e.sets.some(counts)),
        ).length;
        return { id, timeline, current: timeline[timeline.length - 1] ?? null, times };
      }),
    [sessions],
  );

  return (
    <section className="mt-8 px-4">
      <SectionTitle aside="najcięższa seria">Rekordy</SectionTitle>
      <ul className="overflow-hidden rounded-card border border-edge bg-panel">
        {rows.map((row, i) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => navigate(`/rekordy/${row.id}`)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-raised ${
                i ? 'border-t border-edge' : ''
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-chalk">
                  {EXERCISES[row.id].name}
                </span>
                <span className="mt-0.5 block text-[12px] text-ash">
                  {row.current
                    ? `${formatShortDate(row.current.date)} · ${row.timeline.length} ${plural(row.timeline.length, 'rekord', 'rekordy', 'rekordów')}`
                    : row.times
                      ? `${row.times} ${plural(row.times, 'trening', 'treningi', 'treningów')} bez obciążenia`
                      : 'jeszcze nie robione'}
                </span>
              </span>
              {row.current ? (
                <span className="num shrink-0 text-[24px] text-gold">
                  {fmtNum(row.current.weight)}
                  <span className="ml-1 font-sans text-[12px] font-normal text-gold/80">
                    kg × {row.current.reps}
                  </span>
                </span>
              ) : (
                <span className="text-[14px] text-dim">—</span>
              )}
              <IconChevronRight className="size-5 shrink-0 text-dim" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Kopia zapasowa ────────────────────────────────────────────────────── */

function BackupSection({ lastBackupAt, count }: { lastBackupAt: number | null; count: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const share = useMemo(() => canShareFiles(), []);
  const age = lastBackupAt ? daysBetween(lastBackupAt, Date.now()) : null;
  const stale = count > 0 && (age === null || age > 30);

  const onShare = async () => {
    try {
      if (await shareBackup()) {
        markBackupDone();
        showToast('ok', 'Kopia wysłana');
      }
    } catch {
      showToast('info', 'Nie udało się udostępnić — zapisz plik w telefonie');
    }
  };

  const onDownload = () => {
    downloadBackup();
    markBackupDone();
    showToast('ok', 'Kopia zapisana w Pobranych');
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.sessions.length && !parsed.planOverrides) {
        showToast('info', 'W tym pliku nie ma treningów');
        return;
      }
      setPending(parsed);
    } catch (error) {
      showToast('info', error instanceof Error ? error.message : 'Nie udało się wczytać pliku');
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const { added, updated } = mergeSessions(pending.sessions);
    if (pending.planOverrides) mergePlanOverrides(pending.planOverrides);
    setPending(null);
    showToast(
      'ok',
      added || updated
        ? `Dodane: ${added}, zaktualizowane: ${updated}`
        : 'Te treningi już są w aplikacji',
    );
  };

  const fileCount = pending?.sessions.length ?? 0;
  const first = pending?.sessions.reduce((min, s) => Math.min(min, s.startedAt), Infinity) ?? 0;
  const last = pending?.sessions.reduce((max, s) => Math.max(max, s.startedAt), 0) ?? 0;

  return (
    <section className="mt-8 px-4">
      <SectionTitle>Kopia zapasowa</SectionTitle>
      <div className="rounded-card border border-edge bg-panel p-4">
        <div className="flex gap-3">
          <IconShield className={`mt-0.5 size-6 shrink-0 ${stale ? 'text-gold' : 'text-go'}`} />
          <div>
            <p className="text-[15px] font-medium text-chalk">
              {lastBackupAt ? `Ostatnia kopia: ${formatRelativeDay(lastBackupAt)}` : 'Nie masz jeszcze kopii'}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-ash">
              Dane są tylko na tym telefonie. Kopia chroni je przed wyczyszczeniem przeglądarki i
              zmianą telefonu — najpewniej wysłać ją na Dysk Google raz w miesiącu.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {share && (
            <Button variant="day" full onClick={onShare}>
              <IconShare className="size-5" />
              Wyślij kopię (Dysk, Messenger…)
            </Button>
          )}
          <Button variant={share ? 'outline' : 'day'} full onClick={onDownload}>
            <IconDownload className="size-5" />
            Zapisz plik w telefonie
          </Button>
          <Button variant="ghost" full onClick={() => fileRef.current?.click()}>
            <IconUpload className="size-5" />
            Wczytaj kopię z pliku
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onFile}
        />
      </div>

      <Confirm
        open={pending !== null}
        title="Wczytać kopię?"
        message={
          fileCount > 0 ? (
            <>
              W pliku {plural(fileCount, 'jest', 'są', 'jest')} {fileCount}{' '}
              {plural(fileCount, 'trening', 'treningi', 'treningów')} (od {formatShortDate(first)} do{' '}
              {formatShortDate(last)}). Brakujące dopiszę do historii — niczego nie usuwam.
            </>
          ) : (
            'W pliku są tylko zmiany planu. Dopiszę te, których jeszcze nie masz.'
          )
        }
        confirmLabel="Wczytaj kopię"
        onConfirm={confirmImport}
        onClose={() => setPending(null)}
      />
    </section>
  );
}
