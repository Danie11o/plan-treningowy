import { useMemo } from 'react';
import { useLog } from '../store/store';
import { lifetime } from '../lib/stats';
import { formatMonth } from '../lib/date';
import { fmtTons, plural } from '../lib/format';
import type { Session } from '../lib/types';
import { EmptyState, ScreenTitle } from '../components/ui';
import { SessionRow } from '../components/SessionRow';

export function HistoryScreen() {
  const sessions = useLog((s) => s.sessions);
  const life = useMemo(() => lifetime(sessions), [sessions]);

  const months = useMemo(() => {
    const groups: { label: string; sessions: Session[] }[] = [];
    for (const session of [...sessions].reverse()) {
      const label = formatMonth(session.startedAt);
      const group = groups[groups.length - 1];
      if (group && group.label === label) group.sessions.push(session);
      else groups.push({ label, sessions: [session] });
    }
    return groups;
  }, [sessions]);

  return (
    <div>
      <ScreenTitle
        eyebrow={
          sessions.length
            ? `${life.sessions} ${plural(life.sessions, 'trening', 'treningi', 'treningów')} · ${fmtTons(life.kg)} t`
            : undefined
        }
        title="Historia"
      />

      {sessions.length === 0 ? (
        <div className="px-4">
          <EmptyState
            title="Jeszcze nic tu nie ma"
            hint="Każdy zakończony trening pojawi się tutaj — z czasem, ciężarem i wszystkimi seriami."
          />
        </div>
      ) : (
        months.map((month) => (
          <section key={month.label} className="mb-6 px-4">
            <p className="label mb-2.5 text-ash">{month.label}</p>
            <div className="space-y-2">
              {month.sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
