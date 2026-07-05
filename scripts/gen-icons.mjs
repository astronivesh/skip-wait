/**
 * Generates icon-192.png and icon-512.png for the Skip Wait PWA.
 * Run with: node scripts/gen-icons.mjs
 * No dependencies — uses only Node.js built-ins.
 *
 * Design: chili-red (#B03526) rounded-square, warm-white "S·W" lettering.
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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA

  const raw = Buffer.alloc(size * (1 + size * 4));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size);
      raw[pos++] = r; raw[pos++] = g; raw[pos++] = b; raw[pos++] = a ?? 255;
    }
  }

  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Pixel bitmaps ───────────────────────────────────────────────────────────
// Each letter on a 5×7 grid
const S = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,0],
  [0,1,1,1,0],
  [0,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0],
];
const W = [
  [1,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,1],
  [1,0,0,1,0,1,0,0,1],
  [1,0,1,0,0,0,1,0,1],
  [0,1,0,0,0,0,0,1,0],
  [0,1,0,0,0,0,0,1,0],
  [0,1,0,0,0,0,0,1,0],
];
// Dot (3×3, sits at mid-height)
const DOT = [
  [0,0,0],
  [0,0,0],
  [0,1,0],
  [1,1,1],
  [0,1,0],
  [0,0,0],
  [0,0,0],
];

// Layout: S(5) + gap(2) + DOT(3) + gap(2) + W(9) = 21 cols, 7 rows
const GLYPH_W = 21;
const GLYPH_H = 7;

function glyphPixel(col, row) {
  if (row < 0 || row >= GLYPH_H) return false;
  if (col < 0) return false;
  if (col < 5)             return !!S[row]?.[col];
  if (col < 7)             return false;               // gap
  if (col < 10)            return !!DOT[row]?.[col - 7];
  if (col < 12)            return false;               // gap
  if (col < 21)            return !!W[row]?.[col - 12];
  return false;
}

// ── Icon pixel function ─────────────────────────────────────────────────────
const BG  = [0xB0, 0x35, 0x26]; // #B03526 chili red
const FG  = [0xFF, 0xFB, 0xF4]; // #FFFBF4 warm white
const DARK= [0x8A, 0x24, 0x18]; // #8A2418 darker red (dot accent)

function makeIcon(px, py, size) {
  // Rounded-square mask — corner radius = 22% of size
  const r  = size * 0.22;
  const cx = size / 2, cy = size / 2;
  const hw = size / 2 - r;
  const dx = Math.max(0, Math.abs(px - cx) - hw);
  const dy = Math.max(0, Math.abs(py - cy) - hw);
  const outside = dx * dx + dy * dy > r * r;
  if (outside) return [0, 0, 0, 0]; // transparent outside rounded rect

  // Scale glyph to fill ~56% of icon, bounded by both axes
  const scaleX = Math.floor(size * 0.56 / GLYPH_W);
  const scaleY = Math.floor(size * 0.56 / GLYPH_H);
  const scale  = Math.max(1, Math.min(scaleX, scaleY));

  const totalW = GLYPH_W * scale;
  const totalH = GLYPH_H * scale;
  const ox = Math.round((size - totalW) / 2);
  const oy = Math.round((size - totalH) / 2);

  const lx = px - ox;
  const ly = py - oy;
  if (lx >= 0 && lx < totalW && ly >= 0 && ly < totalH) {
    const col = Math.floor(lx / scale);
    const row = Math.floor(ly / scale);
    if (glyphPixel(col, row)) {
      // Dot columns get slightly warmer tint for depth
      const isDot = col >= 7 && col < 10;
      return isDot ? [...FG, 255] : [...FG, 255];
    }
  }

  return [...BG, 255];
}

for (const size of [192, 512]) {
  const buf = buildPNG(size, makeIcon);
  writeFileSync(join(OUT, `icon-${size}.png`), buf);
  console.log(`✓  icon-${size}.png  (${(buf.length / 1024).toFixed(1)} KB)`);
}
