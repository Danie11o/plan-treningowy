import { GROUND, SEG, type Key, type Pose } from '../data/jumps';

/**
 * Geometria animacji skoków — czyste obliczenia, bez Reacta. Z tego samego
 * pliku korzysta komponent JumpFigure i skrypt `npm run jumps`, który rysuje
 * arkusz klatek do sprawdzenia póz.
 */

export type Vec = [number, number];
type Ease = 'lin' | 'in' | 'out' | 'io';

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Odcinek w dół pod kątem od pionu; dodatni kąt = do przodu. */
const down = (deg: number, len: number): Vec => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
const up = (deg: number, len: number): Vec => [Math.sin(rad(deg)) * len, -Math.cos(rad(deg)) * len];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

const EASE: Record<Ease, (u: number) => number> = {
  lin: (u) => u,
  // Spadanie przyspiesza, wznoszenie zwalnia — razem daje parabolę lotu.
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  io: (u) => u * u * (3 - 2 * u),
};

function legVector(pose: Pose, side: 'near' | 'far'): Vec {
  return side === 'near'
    ? add(down(pose.lt, SEG.thigh), down(pose.ls, SEG.shin))
    : add(down(pose.rt, SEG.thigh), down(pose.rs, SEG.shin));
}

function hipOf(key: Key): Vec {
  if (key.hip) return key.hip;
  if (key.foot) return sub(key.foot, legVector(key.pose, key.footOf ?? 'near'));
  return [120, GROUND - 49];
}

function mixPose(a: Pose, b: Pose, u: number): Pose {
  return {
    t: lerp(a.t, b.t, u),
    lt: lerp(a.lt, b.lt, u),
    ls: lerp(a.ls, b.ls, u),
    lf: lerp(a.lf ?? 0, b.lf ?? 0, u),
    rt: lerp(a.rt, b.rt, u),
    rs: lerp(a.rs, b.rs, u),
    rf: lerp(a.rf ?? 0, b.rf ?? 0, u),
    la: lerp(a.la, b.la, u),
    lb: lerp(a.lb, b.lb, u),
    ra: lerp(a.ra, b.ra, u),
    rb: lerp(a.rb, b.rb, u),
  };
}

export interface Frame {
  hip: Vec;
  pose: Pose;
  fade: number;
}

/** Stan sylwetki w chwili t (0..1) pętli. */
export function sample(keys: Key[], t: number): Frame {
  let i = 1;
  while (i < keys.length - 1 && keys[i].at < t) i++;
  const k0 = keys[i - 1];
  const k1 = keys[i];
  const span = k1.at - k0.at;
  const u = span > 0 ? Math.min(1, Math.max(0, (t - k0.at) / span)) : 1;
  const smooth = EASE.io(u);
  const pose = mixPose(k0.pose, k1.pose, smooth);
  const side = k1.footOf ?? 'near';

  let hip: Vec;
  if (k0.foot && k1.foot && !k0.hip && !k1.hip && (k0.footOf ?? 'near') === side) {
    // Stopa zostaje na ziemi, a biodro idzie za kątami nóg — bez ślizgania.
    const anchor: Vec = [lerp(k0.foot[0], k1.foot[0], smooth), lerp(k0.foot[1], k1.foot[1], smooth)];
    hip = sub(anchor, legVector(pose, side));
  } else {
    const h0 = hipOf(k0);
    const h1 = hipOf(k1);
    hip = [lerp(h0[0], h1[0], EASE[k1.x ?? 'io'](u)), lerp(h0[1], h1[1], EASE[k1.y ?? 'io'](u))];
  }
  return { hip, pose, fade: lerp(k0.fade ?? 1, k1.fade ?? 1, u) };
}

export interface Body {
  shoulder: Vec;
  head: Vec;
  near: Vec[];
  far: Vec[];
  nearArm: Vec[];
  farArm: Vec[];
}

export function skeleton({ hip, pose }: Frame): Body {
  const shoulder = add(hip, up(pose.t, SEG.torso));
  const head = add(shoulder, up(pose.t, SEG.neck + SEG.head));
  const leg = (thigh: number, shin: number, foot: number): Vec[] => {
    const knee = add(hip, down(thigh, SEG.thigh));
    const ankle = add(knee, down(shin, SEG.shin));
    const toe: Vec = [
      ankle[0] + Math.cos(rad(foot)) * SEG.foot,
      ankle[1] + Math.sin(rad(foot)) * SEG.foot,
    ];
    return [hip, knee, ankle, toe];
  };
  const arm = (upper: number, fore: number): Vec[] => {
    const elbow = add(shoulder, down(upper, SEG.upperArm));
    return [shoulder, elbow, add(elbow, down(fore, SEG.forearm))];
  };
  return {
    shoulder,
    head,
    near: leg(pose.lt, pose.ls, pose.lf ?? 0),
    far: leg(pose.rt, pose.rs, pose.rf ?? 0),
    nearArm: arm(pose.la, pose.lb),
    farArm: arm(pose.ra, pose.rb),
  };
}

export const toPath = (points: Vec[]) =>
  points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/** Tor biodra w fazach lotu — kropkowana linia pokazuje, jak leci ciało. */
export function flightPath(keys: Key[]): string {
  const parts: string[] = [];
  let run: Vec[] = [];
  for (let i = 1; i < keys.length; i++) {
    if (!keys[i].air) {
      if (run.length > 1) parts.push(toPath(run));
      run = [];
      continue;
    }
    const from = keys[i - 1].at;
    const to = keys[i].at;
    for (let s = run.length ? 1 : 0; s <= 12; s++) run.push(sample(keys, from + ((to - from) * s) / 12).hip);
  }
  if (run.length > 1) parts.push(toPath(run));
  return parts.join('');
}
