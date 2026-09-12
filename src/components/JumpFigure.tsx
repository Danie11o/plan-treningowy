import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUND, SEG, type Jump, type Prop } from '../data/jumps';
import { flightPath, sample, skeleton, toPath } from '../lib/jumpMotion';

/**
 * Animowana sylwetka skoku. Rysunek to kilka odcinków ustawianych kątami
 * (opis w data/jumps.ts, obliczenia w lib/jumpMotion.ts) — bez plików
 * graficznych, więc działa offline i waży tyle, co tekst.
 */

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function JumpFigure({
  jump,
  still = false,
  paused = false,
  className = '',
}: {
  jump: Jump;
  still?: boolean;
  paused?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const moving = !still && !paused && !reduced;
  const [t, setT] = useState(still || reduced ? jump.still : 0);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!moving) return;
    const length = jump.duration * 1000;
    const origin = performance.now() - tRef.current * length;
    let frame = 0;
    const tick = (now: number) => {
      setT(((now - origin) / length) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving, jump]);

  useEffect(() => {
    if (still || reduced) setT(jump.still);
  }, [still, reduced, jump]);

  const trail = useMemo(() => flightPath(jump.keys), [jump]);
  const frame = sample(jump.keys, t);
  const body = skeleton(frame);
  const hand = body.nearArm[2];
  const hasBall = jump.props.some((p) => p.kind === 'ball');
  const hasBar = jump.props.some((p) => p.kind === 'trapbar');

  return (
    <svg viewBox="0 0 240 160" className={className} role="img" aria-label={jump.name}>
      <line x1={0} x2={240} y1={GROUND} y2={GROUND} stroke="var(--color-edge)" strokeWidth={2} />
      {jump.props.map((prop, i) => (
        <Scenery key={i} prop={prop} />
      ))}
      {trail && (
        <path
          d={trail}
          fill="none"
          stroke="var(--day)"
          strokeOpacity={0.7}
          strokeWidth={2.2}
          strokeDasharray="0.1 6"
          strokeLinecap="round"
        />
      )}
      <g opacity={frame.fade} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={toPath(body.farArm)} stroke="var(--color-dim)" strokeWidth={5} />
        <path d={toPath(body.far)} stroke="var(--color-dim)" strokeWidth={6.5} />
        {hasBar && (
          <g>
            <circle cx={hand[0]} cy={hand[1]} r={14} fill="var(--color-raised)" stroke="var(--color-ash)" strokeWidth={1.5} />
            <circle cx={hand[0]} cy={hand[1]} r={3} fill="var(--color-ash)" stroke="none" />
            <line x1={hand[0] - 20} x2={hand[0] + 20} y1={hand[1]} y2={hand[1]} stroke="var(--color-ash)" strokeWidth={3} />
          </g>
        )}
        <path d={toPath([frame.hip, body.shoulder])} stroke="var(--color-chalk)" strokeWidth={8} />
        <circle cx={body.head[0]} cy={body.head[1]} r={SEG.head} fill="var(--color-chalk)" stroke="none" />
        <path d={toPath(body.near)} stroke="var(--color-chalk)" strokeWidth={6.5} />
        {hasBall && (
          <g>
            <circle cx={hand[0] + 5} cy={hand[1] - 2} r={8.5} fill="var(--color-b)" stroke="none" />
            <path
              d={`M${hand[0] - 3.5} ${hand[1] - 2}h17M${hand[0] + 5} ${hand[1] - 10.5}v17`}
              stroke="#6b2a07"
              strokeWidth={1.1}
            />
          </g>
        )}
        <path d={toPath(body.nearArm)} stroke="var(--color-chalk)" strokeWidth={5} />
      </g>
    </svg>
  );
}

function Scenery({ prop }: { prop: Prop }) {
  switch (prop.kind) {
    case 'box': {
      const y = GROUND - prop.h;
      return (
        <g>
          <rect x={prop.x} y={y} width={prop.w} height={prop.h} rx={3} fill="var(--color-raised)" stroke="var(--color-edge)" strokeWidth={1.5} />
          <line x1={prop.x + 4} x2={prop.x + prop.w - 4} y1={y + 1.5} y2={y + 1.5} stroke="var(--color-ash)" strokeOpacity={0.45} strokeWidth={1.5} strokeLinecap="round" />
        </g>
      );
    }
    case 'bench': {
      const y = GROUND - prop.h;
      return (
        <g>
          <line x1={prop.x + 6} x2={prop.x + 6} y1={y} y2={GROUND} stroke="var(--color-edge)" strokeWidth={3} />
          <line x1={prop.x + prop.w - 6} x2={prop.x + prop.w - 6} y1={y} y2={GROUND} stroke="var(--color-edge)" strokeWidth={3} />
          <rect x={prop.x} y={y - 2} width={prop.w} height={6} rx={2} fill="var(--color-raised)" stroke="var(--color-edge)" strokeWidth={1.5} />
        </g>
      );
    }
    case 'hurdle':
      return (
        <path
          d={`M${prop.x - 7} ${GROUND}V${GROUND - prop.h}H${prop.x + 7}V${GROUND}`}
          fill="none"
          stroke="var(--color-ash)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      );
    case 'hoop':
      return (
        <g>
          <rect x={prop.x + 24} y={prop.y - 13} width={3.5} height={24} rx={1} fill="var(--color-ash)" />
          <path
            d={`M${prop.x + 1} ${prop.y}L${prop.x + 5} ${prop.y + 13}M${prop.x + 23} ${prop.y}L${prop.x + 19} ${prop.y + 13}M${prop.x + 5} ${prop.y + 13}H${prop.x + 19}M${prop.x + 9} ${prop.y}L${prop.x + 10} ${prop.y + 13}M${prop.x + 15} ${prop.y}L${prop.x + 14} ${prop.y + 13}`}
            stroke="var(--color-dim)"
            strokeWidth={1}
            fill="none"
          />
          <line x1={prop.x} x2={prop.x + 24} y1={prop.y} y2={prop.y} stroke="var(--color-b)" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      );
    case 'mark':
      return <line x1={prop.x} x2={prop.x} y1={GROUND - 5} y2={GROUND + 5} stroke="var(--day)" strokeWidth={2.5} strokeLinecap="round" />;
    default:
      return null;
  }
}
