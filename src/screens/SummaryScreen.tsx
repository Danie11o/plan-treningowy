import { useLog } from '../store/store';
import { goBack } from '../lib/router';
import { formatLongDate, formatTime } from '../lib/date';
import { SessionReport } from '../components/SessionReport';
import { Button } from '../components/ui';
import { IconCheck } from '../components/icons';

export function SummaryScreen({ id }: { id: string }) {
  const sessions = useLog((s) => s.sessions);
  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="pt-safe px-4 pt-10">
        <p className="text-[16px] text-ash">Tego treningu już nie ma.</p>
        <Button className="mt-4" onClick={() => goBack('/')}>
          Wróć
        </Button>
      </div>
    );
  }

  return (
    <div data-day={session.day} className="pt-safe min-h-dvh px-4 pb-10">
      <div className="pt-8 pb-6">
        <p className="label flex items-center gap-2 text-go">
          <span className="grid size-5 place-items-center rounded-full bg-go text-[#03220f]">
            <IconCheck className="size-3.5" strokeWidth={3} />
          </span>
          Trening zapisany
        </p>
        <h1 className="display mt-3 text-[64px] uppercase leading-[0.82]">
          Trening <span className="text-day">{session.day}</span>
        </h1>
        <p className="mt-3 text-[14px] text-ash first-letter:uppercase">
          {formatLongDate(session.startedAt)} · {formatTime(session.startedAt)}–
          {formatTime(session.finishedAt ?? Date.now())}
        </p>
      </div>

      <SessionReport session={session} all={sessions} />

      <Button variant="day" size="lg" full className="mt-8" onClick={() => goBack('/')}>
        Gotowe
      </Button>
    </div>
  );
}
