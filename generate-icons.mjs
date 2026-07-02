// Generates the LifeOS app icons (sunrise arc over horizon, gold on dark)
// as PNGs with no dependencies — raw PNG encoding via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const INK = [0x0c, 0x0b, 0x09];
const GOLD = [0xd4, 0xa8, 0x43];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePNG(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Distance from point to horizontal segment centered at (cx, cy), half-length h
const segDist = (x, y, cx, cy, h) => Math.hypot(Math.max(Math.abs(x - cx) - h, 0), y - cy);

function render(size) {
  const img = Buffer.alloc(size * size * 3);
  const cx = size / 2;
  const cy = size * 0.60;          // horizon height
  const r = size * 0.24;           // arc radius
  const stroke = size * 0.045;     // stroke half-width basis
  const lineHalf = size * 0.33;    // horizon half-length
  const half = stroke / 2;
  const cov = (d) => Math.min(Math.max(half + 0.9 - d, 0), 1); // soft AA edge

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 0;
      if (y <= cy) a = cov(Math.abs(Math.hypot(x - cx, y - cy) - r)); // arc
      a = Math.max(a, cov(segDist(x, y, cx, cy, lineHalf)));          // horizon
      const i = (y * size + x) * 3;
      for (let ch = 0; ch < 3; ch++) img[i + ch] = Math.round(INK[ch] + (GOLD[ch] - INK[ch]) * a);
    }
  }
  return img;
}

mkdirSync("icons", { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`icons/icon-${size}.png`, encodePNG(size, render(size)));
  console.log(`icons/icon-${size}.png written`);
}
