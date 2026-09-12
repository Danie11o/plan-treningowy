import { createServer } from 'vite';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/**
 * Arkusz klatek wszystkich skoków — do sprawdzania póz po zmianach w
 * src/data/jumps.ts. Każdy wiersz to jeden skok, kolumny to kolejne chwile pętli.
 *
 *   npm run jumps                         → jump-sheet.png w katalogu projektu
 *   npm run jumps -- plik.png 0 7         → tylko skoki od 0 do 6
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, fromArg, toArg] = process.argv.slice(2);
const out = resolve(outArg ?? join(root, 'jump-sheet.png'));

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
});
const { JUMPS, GROUND, SEG } = await server.ssrLoadModule('/src/data/jumps.ts');
const { sample, skeleton, flightPath, toPath } = await server.ssrLoadModule('/src/lib/jumpMotion.ts');
await server.close();

const C = {
  bg: '#161a22',
  panel: '#1e232d',
  raised: '#272d39',
  edge: '#323947',
  chalk: '#f1f3f7',
  ash: '#a3abbb',
  dim: '#6c7487',
  day: '#7391ff',
  ball: '#ff8b3d',
};
const FRAMES = [0.06, 0.2, 0.3, 0.38, 0.46, 0.54, 0.62, 0.74, 0.88];
const CW = 240;
const CH = 160;
const LABEL = 200;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function scenery(p) {
  switch (p.kind) {
    case 'box':
      return `<rect x="${p.x}" y="${GROUND - p.h}" width="${p.w}" height="${p.h}" rx="3" fill="${C.raised}" stroke="${C.edge}" stroke-width="1.5"/>`;
    case 'bench':
      return `<line x1="${p.x + 6}" x2="${p.x + 6}" y1="${GROUND - p.h}" y2="${GROUND}" stroke="${C.edge}" stroke-width="3"/><line x1="${p.x + p.w - 6}" x2="${p.x + p.w - 6}" y1="${GROUND - p.h}" y2="${GROUND}" stroke="${C.edge}" stroke-width="3"/><rect x="${p.x}" y="${GROUND - p.h - 2}" width="${p.w}" height="6" rx="2" fill="${C.raised}" stroke="${C.edge}"/>`;
    case 'hurdle':
      return `<path d="M${p.x - 7} ${GROUND}V${GROUND - p.h}H${p.x + 7}V${GROUND}" fill="none" stroke="${C.ash}" stroke-width="2.5"/>`;
    case 'hoop':
      return `<rect x="${p.x + 24}" y="${p.y - 20}" width="3.5" height="30" fill="${C.ash}"/><line x1="${p.x}" x2="${p.x + 24}" y1="${p.y}" y2="${p.y}" stroke="${C.ball}" stroke-width="2.5"/>`;
    case 'mark':
      return `<line x1="${p.x}" x2="${p.x}" y1="${GROUND - 5}" y2="${GROUND + 5}" stroke="${C.day}" stroke-width="2.5"/>`;
    default:
      return '';
  }
}

function figure(jump, t) {
  const frame = sample(jump.keys, t);
  const b = skeleton(frame);
  const hand = b.nearArm[2];
  const ball = jump.props.some((p) => p.kind === 'ball')
    ? `<circle cx="${hand[0] + 5}" cy="${hand[1] - 2}" r="8.5" fill="${C.ball}"/>`
    : '';
  const bar = jump.props.some((p) => p.kind === 'trapbar')
    ? `<circle cx="${hand[0]}" cy="${hand[1]}" r="14" fill="${C.raised}" stroke="${C.ash}" stroke-width="1.5"/><line x1="${hand[0] - 20}" x2="${hand[0] + 20}" y1="${hand[1]}" y2="${hand[1]}" stroke="${C.ash}" stroke-width="3"/>`
    : '';
  return `<g opacity="${Math.max(0.15, frame.fade).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${toPath(b.farArm)}" stroke="${C.dim}" stroke-width="5"/>
    <path d="${toPath(b.far)}" stroke="${C.dim}" stroke-width="6.5"/>
    ${bar}
    <path d="${toPath([frame.hip, b.shoulder])}" stroke="${C.chalk}" stroke-width="8"/>
    <circle cx="${b.head[0]}" cy="${b.head[1]}" r="${SEG.head}" fill="${C.chalk}" stroke="none"/>
    <path d="${toPath(b.near)}" stroke="${C.chalk}" stroke-width="6.5"/>
    ${ball}
    <path d="${toPath(b.nearArm)}" stroke="${C.chalk}" stroke-width="5"/>
  </g>`;
}

const list = JUMPS.slice(Number(fromArg ?? 0), Number(toArg ?? JUMPS.length));
let body = '';
list.forEach((jump, r) => {
  const y = r * CH;
  body += `<text x="12" y="${y + 80}" fill="${C.chalk}" font-family="Arial" font-size="16">${esc(jump.name)}</text>`;
  const trail = flightPath(jump.keys);
  FRAMES.forEach((t, c) => {
    const x = LABEL + c * CW;
    body += `<g transform="translate(${x} ${y})">
      <rect x="2" y="2" width="${CW - 4}" height="${CH - 4}" rx="8" fill="${C.panel}"/>
      <line x1="0" x2="${CW}" y1="${GROUND}" y2="${GROUND}" stroke="${C.edge}" stroke-width="2"/>
      ${jump.props.map(scenery).join('')}
      ${trail ? `<path d="${trail}" fill="none" stroke="${C.day}" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="0.1 6" stroke-linecap="round"/>` : ''}
      ${figure(jump, t)}
      <text x="8" y="18" fill="${C.dim}" font-family="Arial" font-size="12">${t}</text>
    </g>`;
  });
});

const W = LABEL + FRAMES.length * CW;
const H = list.length * CH;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${C.bg}"/>${body}</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Arkusz skoków →', out);
