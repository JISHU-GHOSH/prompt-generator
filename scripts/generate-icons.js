import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function renderPixel(x, y, width, height) {
  const radius = Math.floor(width * 0.22);
  const isOutsideCorner =
    (x < radius && y < radius && Math.hypot(x - radius, y - radius) > radius) ||
    (x >= width - radius && y < radius && Math.hypot(x - (width - radius - 1), y - radius) > radius) ||
    (x < radius && y >= height - radius && Math.hypot(x - radius, y - (height - radius - 1)) > radius) ||
    (x >= width - radius && y >= height - radius && Math.hypot(x - (width - radius - 1), y - (height - radius - 1)) > radius);

  if (isOutsideCorner) {
    return [0, 0, 0, 0];
  }

  const nx = x / width;
  const ny = y / height;

  const isStem = nx >= 0.26 && nx <= 0.40 && ny >= 0.22 && ny <= 0.78;
  const isLoopTop = nx >= 0.26 && nx <= 0.68 && ny >= 0.22 && ny <= 0.35;
  const isLoopMid = nx >= 0.26 && nx <= 0.68 && ny >= 0.45 && ny <= 0.58;
  const isLoopRight = nx >= 0.55 && nx <= 0.69 && ny >= 0.22 && ny <= 0.58;
  const isSpark = Math.hypot(nx - 0.78, ny - 0.24) < 0.07;

  if (isStem || isLoopTop || isLoopMid || isLoopRight || isSpark) {
    return [255, 255, 255, 255];
  }

  const r = Math.round(99 - (nx + ny) * 12);
  const g = Math.round(102 - (nx + ny) * 18);
  const b = Math.round(241 - (nx + ny) * 8);
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b), 255];
}

function createPngBuffer(width, height) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [16, 48, 128];
for (const size of sizes) {
  const buffer = createPngBuffer(size, size);
  const outputPath = path.resolve(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${outputPath} (${buffer.length} bytes)`);
}

console.log('Successfully generated all icon assets.');
