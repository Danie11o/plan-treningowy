import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Osobna pamięć testowa: żaden test nie odczytuje historii użytkownika.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { PLAN, TRACKED_EXERCISES, planFor } = await server.ssrLoadModule('/src/data/plan.ts');
  const { createSession, finalizeSession } = await server.ssrLoadModule('/src/lib/session.ts');
  const { nextDay, upcoming, weekCells } = await server.ssrLoadModule('/src/lib/schedule.ts');
  const { sessionTotals, lifetime, currentRecord, lastPerformance, previousOfDay } =
    await server.ssrLoadModule('/src/lib/stats.ts');
  const { parseBackup } = await server.ssrLoadModule('/src/lib/backup.ts');
  const store = await server.ssrLoadModule('/src/store/store.ts');
  const thursday = new Date(2026, 9, 22, 12);
  const saturday = new Date(2026, 9, 24, 12);
  const session = (day, date = thursday) => {
    const s = createSession(day, PLAN[day]);
    return { ...s, startedAt: date.getTime(), finishedAt: date.getTime() + 30 * 60000 };
  };
  const a = session('A', new Date(2026, 9, 17, 12));
  const b = session('B', new Date(2026, 9, 17, 13));
  const c = session('C');

  assert.equal(c.exercises.length, 6);
  assert.equal(c.exercises.reduce((sum, e) => sum + e.sets.length, 0), 13);
  assert.equal(nextDay([]), 'A');
  assert.equal(nextDay([c]), 'A');
  assert.equal(nextDay([a, c]), 'B');
  assert.equal(nextDay([a, b, c]), 'A');
  assert.equal(nextDay([a], c), 'B');
  assert.equal(nextDay([a], session('B')), 'A');

  for (const date of [thursday, saturday]) {
    const extra = session('C', date);
    const next = upcoming(date, [4, 6], [a, extra]);
    assert.equal(next.isToday, true, 'C nie przesuwa terminu A/B');
    assert.equal(next.day, 'B');
    const cells = weekCells(date, [4, 6], [a, extra], null);
    assert.equal(cells.find((cell) => cell.isToday).planned, 'B');
    assert.equal(cells.find((cell) => cell.isToday).done[0].day, 'C');
    const activeCells = weekCells(date, [4, 6], [a], extra);
    assert.equal(activeCells.find((cell) => cell.isToday).planned, 'B');
    assert.equal(activeCells.find((cell) => cell.isToday).inProgress, 'C');
  }
  const sameDay = session('A', thursday);
  assert.equal(upcoming(thursday, [4, 6], [a, sameDay, c]).date.getDay(), 6);
  assert.equal(weekCells(thursday, [4, 6], [a, sameDay, c], null).find((cell) => cell.isToday).planned, null);

  const completed = finalizeSession({
    ...c,
    exercises: c.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({
      ...s, weight: e.exerciseId === 'pallof-press' ? 12.5 : 20,
      reps: e.exerciseId === 'pallof-press' ? 10 : 5, done: true, doneAt: thursday.getTime(),
    })) })),
  }, thursday.getTime() + 1800000);
  assert.deepEqual(sessionTotals(completed), { sets: 13, kg: 1600, reps: 95 });
  const stats = lifetime([a, b, completed]);
  assert.deepEqual([stats.sessions, stats.a, stats.b, stats.c], [3, 1, 1, 1]);
  assert.equal(stats.kg, 1600);
  assert.equal(currentRecord([completed], 'push-press').weight, 20);
  assert.equal(lastPerformance([completed], 'pallof-press', 'C').top.reps, 10);
  assert.equal(previousOfDay(session('C', saturday), [a, b, completed]).id, completed.id);
  assert.ok(PLAN.C.every((item) => TRACKED_EXERCISES.includes(item.exerciseId)));

  const override = { sets: { min: 4, max: 4 }, reps: { min: 4, max: 6 }, weight: 22.5 };
  const parsed = parseBackup(JSON.stringify({
    format: 'trening-ab', version: 1, sessions: [a, b, completed],
    planOverrides: { C: { 'push-press': override } },
  }));
  assert.equal(parsed.sessions.length, 3, 'Kopia zachowuje A, B i C');
  assert.equal(parsed.sessions[2].day, 'C');
  assert.deepEqual(parsed.planOverrides.C['push-press'], override);
  assert.equal(parseBackup(JSON.stringify({ format: 'trening-ab', sessions: [a, b] })).sessions.length, 2);
  store.mergePlanOverrides(parsed.planOverrides);
  assert.equal(planFor('C', store.useLog.getState().settings.planOverrides)[0].weight, 22.5);
  store.mergeSessions(parsed.sessions);
  const active = store.startWorkout('C');
  assert.equal(active.exercises[0].sets.length, 4);
  assert.equal(active.exercises[0].target.weight, 22.5);
  assert.equal(nextDay(store.useLog.getState().sessions, active), 'A');
  assert.equal(store.useActive.getState().active.day, 'C');
  console.log('OK: rotacja A/B, kalendarz, C w toku, plan, sumy obu stron, rekordy, historia i zgodność kopii zapasowych.');
} finally {
  await server.close();
}
