import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../apps/mobile/assets/images');

// PNG CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const toCrc = Buffer.concat([typeBuf, dataBuf]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createPng(width, height, pixelFn) {
  // IHDR chunk (13 bytes)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression method 0
  ihdr[11] = 0; // filter method 0
  ihdr[12] = 0; // interlace method 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
}

// Colors: RGBA
const PETROLEUM = [0x0f, 0x4c, 0x5c, 0xff]; // #0F4C5C
const AMBER = [0xf2, 0xa5, 0x41, 0xff];     // #F2A541
const WHITE = [0xff, 0xff, 0xff, 0xff];     // #FFFFFF
const TRANSPARENT = [0, 0, 0, 0];

function circlePixel(bg, fg, radiusRatio = 0.3) {
  return (x, y, width, height) => {
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    const r = Math.min(width, height) * radiusRatio;
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r * r) {
      return fg;
    }
    return bg;
  };
}

function solidPixel(color) {
  return () => color;
}

const icons = [
  { name: 'icon.png', w: 1024, h: 1024, fn: circlePixel(PETROLEUM, AMBER, 0.3) },
  { name: 'adaptive-icon.png', w: 1024, h: 1024, fn: circlePixel(PETROLEUM, AMBER, 0.3) },
  { name: 'android-adaptive-foreground.png', w: 432, h: 432, fn: circlePixel(TRANSPARENT, AMBER, 0.3) },
  { name: 'android-icon-foreground.png', w: 512, h: 512, fn: circlePixel(TRANSPARENT, AMBER, 0.3) },
  { name: 'splash-icon.png', w: 1024, h: 1024, fn: circlePixel(TRANSPARENT, AMBER, 0.3) },
  { name: 'android-icon-monochrome.png', w: 432, h: 432, fn: circlePixel(TRANSPARENT, WHITE, 0.3) },
  { name: 'android-icon-background.png', w: 512, h: 512, fn: solidPixel(PETROLEUM) },
  { name: 'favicon.png', w: 48, h: 48, fn: circlePixel(PETROLEUM, AMBER, 0.3) },
];

fs.mkdirSync(outDir, { recursive: true });

for (const icon of icons) {
  const filePath = path.join(outDir, icon.name);
  const pngBuf = createPng(icon.w, icon.h, icon.fn);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${icon.name} (${icon.w}x${icon.h})`);
}
