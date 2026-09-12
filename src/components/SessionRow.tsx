import { sessionDuration, sessionTotals } from '../lib/stats';
import { navigate } from '../lib/router';
import { formatDuration, formatLongDate } from '../lib/date';
import { fmtKg, plural } from '../lib/format';
import type { Session } from '../lib/types';
import { DayBadge } from './ui';
import { IconChevronRight } from './icons';

export function SessionRow({ session }: { session: Session }) {
  const totals = sessionTotals(session);
  return (
    <button
      type="button"
      onClick={() => navigate(`/historia/${session.id}`)}
      className="flex w-full items-center gap-3 rounded-card border border-edge bg-panel p-4 text-left active:bg-raised"
    >
      <DayBadge day={session.day} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-chalk first-letter:uppercase">
          {formatLongDate(session.startedAt)}
        </span>
        <span className="mt-0.5 block text-[13px] text-ash">
          {formatDuration(sessionDuration(session), false)} · {fmtKg(totals.kg)} · {totals.sets}{' '}
          {plural(totals.sets, 'seria', 'serie', 'serii')}
        </span>
      </span>
      <IconChevronRight className="size-5 shrink-0 text-dim" />
    </button>
  );
}
