import { useState } from 'react';
import { deleteSession, useLog } from '../store/store';
import { goBack, leaveOverlays, navigate } from '../lib/router';
import { formatLongDate, formatTime } from '../lib/date';
import { SessionReport } from '../components/SessionReport';
import { BackBar, Button, Confirm, EmptyState, showToast } from '../components/ui';
import { IconPencil, IconTrash } from '../components/icons';

export function SessionScreen({ id }: { id: string }) {
  const sessions = useLog((s) => s.sessions);
  const session = sessions.find((s) => s.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!session) {
    return (
      <div>
        <BackBar title="Trening" onBack={() => goBack('/historia')} />
        <div className="px-4 pt-6">
          <EmptyState title="Tego treningu już nie ma" hint="Mógł zostać usunięty." />
        </div>
      </div>
    );
  }

  return (
    <div data-day={session.day}>
      <BackBar title={`Trening ${session.day}`} onBack={() => goBack('/historia')} />
      <p className="px-4 pt-4 pb-4 text-[14px] text-ash first-letter:uppercase">
        {formatLongDate(session.startedAt)} · {formatTime(session.startedAt)}–
        {formatTime(session.finishedAt ?? session.startedAt)}
      </p>
      <div className="px-4">
        <SessionReport session={session} all={sessions} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 px-4">
        <Button variant="outline" onClick={() => navigate(`/popraw/${session.id}`)}>
          <IconPencil className="size-5" />
          Popraw serie
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <IconTrash className="size-5" />
          Usuń trening
        </Button>
      </div>

      <Confirm
        open={confirmDelete}
        title="Usunąć trening?"
        message="Trening zniknie z historii, a rekordy i sumy przeliczą się bez niego. Tego nie da się cofnąć."
        confirmLabel="Usuń trening"
        danger
        onConfirm={async () => {
          await leaveOverlays();
          deleteSession(session.id);
          showToast('info', 'Trening usunięty');
          goBack('/historia');
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
