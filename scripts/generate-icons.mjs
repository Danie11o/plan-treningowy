import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

/**
 * Ikona Plan treningowy: litery A i B w kolorach treningów (kobalt i pomarańcz),
 * wąskie i grube jak numer na koszulce. Rysowane ścieżkami, więc nie zależą
 * od zainstalowanych czcionek. Uruchom: npm run icons
 */

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BG = '#161A22';
const A = '#7391FF';
const B = '#FF8B3D';
const SIZE = 512;

// Litery w siatce 100×100, razem zajmują x 12..90, y 18..82.
const LETTER_A =
  'M12 82L25 18H37L50 82H40L37.4 68H24.6L22 82ZM26.3 59H35.7L31 33Z';
const LETTER_B =
  'M54 18H75C84.5 18 89 23.5 89 32C89 38.5 86 42.5 81.5 44.5C87 46.5 90 51 90 58.5V66C90 76 84.5 82 74.5 82H54Z' +
  'M64 27V41H73.5C77.5 41 79.5 38.8 79.5 34C79.5 29.2 77.5 27 73.5 27Z' +
  'M64 50V73H74C78.3 73 80.5 70.5 80.5 66V57C80.5 52.5 78.3 50 74 50Z';

function markup({ scale, radius }) {
  const c = SIZE / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="${BG}"/>
  <g transform="translate(${c} ${c}) scale(${scale}) translate(-51 -50)" fill-rule="evenodd">
    <path d="${LETTER_A}" fill="${A}"/>
    <path d="${LETTER_B}" fill="${B}"/>
  </g>
</svg>`;
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

await mkdir(OUT, { recursive: true });

const standard = markup({ scale: 4.1, radius: 112 });
// Maskowalna: pełne tło, mniejszy znak — system przytnie ją do własnego kształtu.
const maskable = markup({ scale: 3.3, radius: 0 });

await Promise.all([
  writeFile(join(OUT, 'favicon.svg'), markup({ scale: 4.1, radius: 96 })),
  png(standard, 192).then((b) => writeFile(join(OUT, 'icon-192.png'), b)),
  png(standard, 512).then((b) => writeFile(join(OUT, 'icon-512.png'), b)),
  png(maskable, 512).then((b) => writeFile(join(OUT, 'icon-maskable-512.png'), b)),
  png(markup({ scale: 4.1, radius: 0 }), 180).then((b) => writeFile(join(OUT, 'apple-touch-icon.png'), b)),
]);

console.log('Ikony gotowe →', OUT);
