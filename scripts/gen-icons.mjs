/**
 * Generates icon-192.png and icon-512.png for the Skip Wait PWA.
 * Run with: node scripts/gen-icons.mjs
 * No dependencies — uses only Node.js built-ins.
 */
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "frontend", "public");

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG helpers ─────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function buildPNG(size, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  const raw = Buffer.alloc(size * (1 + size * 3));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size);
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
    }
  }

  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Pixel art "SW" (each letter on a 5×7 grid) ─────────────────────────────
const LETTER_S = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];
const LETTER_W = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 0, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
];
const LETTER_H = 7;

function makeIcon(x, y, size) {
  // Brand colours
  const BG  = [0xf1, 0x57, 0x00]; // #F15700 orange
  const FG  = [0xff, 0xff, 0xff]; // white

  // Rounded-square mask: corner radius = 22% of size
  const r   = size * 0.22;
  const cx  = size / 2, cy = size / 2;
  const hw  = size / 2 - r;
  const dx  = Math.max(0, Math.abs(x - cx) - hw);
  const dy  = Math.max(0, Math.abs(y - cy) - hw);
  if (dx * dx + dy * dy > r * r) return [0xff, 0xff, 0xff]; // transparent white outside

  // "SW" text — scale so the combined 14-wide × 7-tall glyph fills ~55% of the icon
  const glyphW = 14; // 5 (S) + 2 (gap) + 9 (W) ... use 5+2+7 for W inner cols
  const scale  = Math.max(1, Math.floor(size * 0.55 / LETTER_H));
  const totalW = (5 + 2 + 9) * scale;
  const totalH = LETTER_H * scale;
  const ox     = Math.round((size - totalW) / 2);
  const oy     = Math.round((size - totalH) / 2);

  const lx = x - ox, ly = y - oy;
  if (lx >= 0 && ly >= 0 && ly < totalH) {
    const row = Math.floor(ly / scale);
    // S
    if (lx < 5 * scale) {
      const col = Math.floor(lx / scale);
      if (LETTER_S[row]?.[col]) return FG;
    }
    // W (offset by 7 cols: 5 S + 2 gap)
    const wx = lx - 7 * scale;
    if (wx >= 0 && wx < 9 * scale) {
      const col = Math.floor(wx / scale);
      if (LETTER_W[row]?.[col]) return FG;
    }
  }

  return BG;
}

for (const size of [192, 512]) {
  const buf = buildPNG(size, makeIcon);
  writeFileSync(join(OUT, `icon-${size}.png`), buf);
  console.log(`✓  ${OUT}/icon-${size}.png  (${buf.length} bytes)`);
}
