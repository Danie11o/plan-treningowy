import { useMemo } from 'react';
import { planFor } from '../data/plan';
import { useLog } from '../store/store';
import type { DayKey, PlanItem } from './types';

/** Aktualny plan dnia — z pliku plus zmiany wprowadzone w aplikacji. */
export function usePlan(day: DayKey): PlanItem[] {
  const overrides = useLog((s) => s.settings.planOverrides);
  return useMemo(() => planFor(day, overrides), [day, overrides]);
}
