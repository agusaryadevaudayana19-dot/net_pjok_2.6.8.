import fs from 'node:fs';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Normalized Lucide Zap points on a 24x24 canvas
const ZAP_POINTS_24 = [
  [13, 2],
  [3, 14],
  [12, 14],
  [11, 22],
  [21, 10],
  [12, 10],
];

function isInsidePoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generates an anti-aliased PNG icon matching the in-app NET PJOK logo.
 * 
 * @param {number} size Pixel width and height
 * @param {'any' | 'maskable' | 'ios' | 'favicon'} mode Rendering mode
 */
function generateNetPjokPng(size, mode = 'any') {
  const scanlineLen = 1 + size * 4;
  const rawData = Buffer.alloc(scanlineLen * size);

  const half = size / 2;
  const radius = size * 0.22; // rounded squircle radius
  const innerHalf = half - radius;

  // Scale for Zap symbol
  // For maskable, stay strictly within safe 80% circle (radius 0.40 * size)
  const boltScale = mode === 'maskable' ? (size * 0.52) / 20 : (size * 0.60) / 20;

  // 2x2 Subpixel supersampling offsets for high quality anti-aliasing
  const subOffsets = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      let totalSquircleAlpha = 0;
      let totalBoltAlpha = 0;

      for (const [ox, oy] of subOffsets) {
        const subX = x + ox;
        const subY = y + oy;

        // Check if inside squircle
        let inSquircle = false;
        if (mode === 'maskable') {
          inSquircle = true; // Maskable icons must fill the entire canvas
        } else if (mode === 'ios') {
          // iOS apple-touch-icon requires square canvas without transparent corners
          // The iOS system applies its own corner mask
          inSquircle = true;
        } else {
          const dx = Math.max(0, Math.abs(subX - half) - innerHalf);
          const dy = Math.max(0, Math.abs(subY - half) - innerHalf);
          if (dx * dx + dy * dy <= radius * radius) {
            inSquircle = true;
          }
        }

        if (inSquircle) {
          totalSquircleAlpha += 0.25;

          // Check if inside Zap bolt
          // Map subpixel coordinate to 24x24 Lucide space centered at (12, 12)
          const lx = 12 + (subX - half) / boltScale;
          const ly = 12 + (subY - half) / boltScale;

          if (isInsidePoly(lx, ly, ZAP_POINTS_24)) {
            totalBoltAlpha += 0.25;
          }
        }
      }

      if (totalSquircleAlpha === 0) {
        // Transparent pixel
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Background gradient: from #2563EB (37, 99, 235) to #1D4ED8 (29, 78, 216)
      const gradFactor = (x + y) / (size * 2);
      const bgR = Math.round(37 * (1 - gradFactor) + 29 * gradFactor);
      const bgG = Math.round(99 * (1 - gradFactor) + 78 * gradFactor);
      const bgB = Math.round(235 * (1 - gradFactor) + 216 * gradFactor);

      // Subtle inner border highlight near squircle edge (top/left)
      let finalR = bgR;
      let finalG = bgG;
      let finalB = bgB;

      // Composite the crisp white Zap bolt over the royal blue gradient
      if (totalBoltAlpha > 0) {
        const boltR = 255;
        const boltG = 255;
        const boltB = 255;

        finalR = Math.round(finalR * (1 - totalBoltAlpha) + boltR * totalBoltAlpha);
        finalG = Math.round(finalG * (1 - totalBoltAlpha) + boltG * totalBoltAlpha);
        finalB = Math.round(finalB * (1 - totalBoltAlpha) + boltB * totalBoltAlpha);
      }

      const finalA = Math.round(totalSquircleAlpha * 255);

      rawData[pixelOffset] = finalR;
      rawData[pixelOffset + 1] = finalG;
      rawData[pixelOffset + 2] = finalB;
      rawData[pixelOffset + 3] = finalA;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: 6 = RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all standard PWA and App icon assets
console.log('Generating NET PJOK PWA icon assets...');

fs.writeFileSync('public/pwa-192x192.png', generateNetPjokPng(192, 'any'));
fs.writeFileSync('public/pwa-512x512.png', generateNetPjokPng(512, 'any'));
fs.writeFileSync('public/pwa-maskable-512x512.png', generateNetPjokPng(512, 'maskable'));
fs.writeFileSync('public/apple-touch-icon.png', generateNetPjokPng(180, 'ios'));
fs.writeFileSync('public/favicon.png', generateNetPjokPng(64, 'any'));

// Also write crisp scalable SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="netPjokGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <filter id="boltShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0F172A" flood-opacity="0.3" />
    </filter>
  </defs>
  <!-- Background Squircle matching in-app rounded container -->
  <rect width="512" height="512" rx="112" fill="url(#netPjokGradient)" />
  <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#93C5FD" stroke-width="4" stroke-opacity="0.3" />
  
  <!-- Centered Lucide Zap bolt -->
  <polygon points="278.4 53.6 84 278.4 256 278.4 237.6 432.8 432 208 256 208" fill="#FFFFFF" filter="url(#boltShadow)" />
</svg>
`;

fs.writeFileSync('public/favicon.svg', svgContent, 'utf-8');

console.log('Successfully generated all NET PJOK PWA icons in public/ directory:');
console.log('- public/pwa-192x192.png');
console.log('- public/pwa-512x512.png');
console.log('- public/pwa-maskable-512x512.png');
console.log('- public/apple-touch-icon.png');
console.log('- public/favicon.png');
console.log('- public/favicon.svg');
