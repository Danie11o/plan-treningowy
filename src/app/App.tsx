import type { ComponentType, ReactNode } from 'react';
import { currentEntry, matchRoute, navigate, usePath } from '../lib/router';
import { IconHistory, IconPlan, IconToday, IconUser } from '../components/icons';
import { ToastHost } from '../components/ui';
import { TodayScreen } from '../screens/TodayScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SessionScreen } from '../screens/SessionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RecordScreen } from '../screens/RecordScreen';
import { WorkoutScreen, EditSessionScreen } from '../screens/WorkoutScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { JumpsScreen, JumpDetailScreen } from '../screens/JumpsScreen';

const TABS: { to: string; label: string; Icon: ComponentType<{ className?: string }>; also: string[] }[] = [
  { to: '/', label: 'Dziś', Icon: IconToday, also: [] },
  { to: '/plan', label: 'Plan', Icon: IconPlan, also: ['/plan/'] },
  { to: '/historia', label: 'Historia', Icon: IconHistory, also: ['/historia/'] },
  { to: '/profil', label: 'Profil', Icon: IconUser, also: ['/rekordy/'] },
];

interface Route {
  element: ReactNode;
  /** Trening i podsumowanie idą na pełny ekran — nic nie odciąga od serii. */
  immersive: boolean;
}

function resolve(path: string): Route {
  let m: Record<string, string> | null;
  if (path === '/plan') return { element: <PlanScreen />, immersive: false };
  if (path === '/plan/c') return { element: <PlanScreen key="C" initialDay="C" />, immersive: false };
  if (path === '/historia') return { element: <HistoryScreen />, immersive: false };
  if ((m = matchRoute('/historia/:id', path))) {
    return { element: <SessionScreen key={m.id} id={m.id} />, immersive: false };
  }
  if (path === '/profil') return { element: <ProfileScreen />, immersive: false };
  if ((m = matchRoute('/rekordy/:exerciseId', path))) {
    return { element: <RecordScreen exerciseId={m.exerciseId} />, immersive: false };
  }
  if (path === '/trening') return { element: <WorkoutScreen />, immersive: true };
  if ((m = matchRoute('/popraw/:id', path))) {
    return { element: <EditSessionScreen key={m.id} id={m.id} />, immersive: true };
  }
  if ((m = matchRoute('/podsumowanie/:id', path))) {
    return { element: <SummaryScreen id={m.id} />, immersive: true };
  }
  if (path === '/skoki') return { element: <JumpsScreen />, immersive: true };
  if ((m = matchRoute('/skoki/:id', path))) {
    return { element: <JumpDetailScreen key={m.id} id={m.id} />, immersive: true };
  }
  return { element: <TodayScreen />, immersive: false };
}

export function App() {
  const path = usePath();
  const route = resolve(path);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px]">
      <main className={route.immersive ? '' : 'pb-28'}>{route.element}</main>
      {!route.immersive && <TabBar path={path} />}
      <ToastHost />
    </div>
  );
}

function goTab(to: string, path: string) {
  if (to === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (to === '/') {
    // Powrót na „Dziś" cofa historię do startu, żeby kolejne „wstecz" zamknęło aplikację.
    const depth = currentEntry();
    if (depth > 0) history.go(-depth);
    else navigate('/', { replace: true });
    return;
  }
  navigate(to, { replace: path !== '/' });
}

function TabBar({ path }: { path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-edge bg-night/92 pb-safe backdrop-blur-xl">
      <ul className="flex">
        {TABS.map(({ to, label, Icon, also }) => {
          const active = path === to || also.some((prefix) => path.startsWith(prefix));
          return (
            <li key={to} className="flex-1">
              <button
                type="button"
                onClick={() => goTab(to, path)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-1.5 transition-colors ${
                  active ? 'text-chalk' : 'text-dim'
                }`}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    active ? 'bg-raised' : ''
                  }`}
                >
                  <Icon className="size-[22px]" />
                </span>
                <span className="text-[12px] font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
