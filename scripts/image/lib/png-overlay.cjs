// ============================================================================
// scripts/image/lib/png-overlay.cjs — dependency-free PNG logo compositor
// ============================================================================
// Capability `image-platform` v0.3 (/cla extend: brand-scoped corner logo overlay).
//
// WHY THIS EXISTS: when `--style=<brand>` declares a `logo.overlay` policy and a
// `--ref` brand asset is given, /image stops feeding the logo to the OpenAI *edits*
// endpoint (which reproduces a square logo BIG + CENTERED) and instead generates a
// clean base image, then stamps the REAL logo asset small in a corner — pixel-perfect,
// deterministic placement. That stamping is this module.
//
// PURE NODE, ZERO DEPENDENCIES: built on the stdlib `zlib` only (sharp / ImageMagick
// are absent here and CI has no native-build job — adding one would be a CI risk). The
// scope is deliberately narrow: 8-bit, non-interlaced PNGs in colorType 0/2/4/6 — which
// is what gpt-image-2 emits and what the ritsu logo asset is (RGBA). Anything outside
// that throws a PngOverlayError; the caller (gen.cjs) catches it, WARNS, and writes the
// un-overlaid base image — never crashes (mirrors the platform's warn-don't-drop rule).
//
// Pipeline: decodePng(base) + decodePng(logo) → resizeRGBA(logo, small) [alpha-weighted
// box average, so a transparent-background mark downscales with NO dark halo] →
// compositeOver(base, small, x, y) ["over" alpha blend] → encodePng → Buffer.
// ============================================================================

'use strict';

const zlib = require('zlib');

class PngOverlayError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PngOverlayError';
  }
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ── CRC32 (PNG polynomial 0xEDB88320) ───────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Channels per PNG color type (8-bit). 3=palette is unsupported (no alpha source we use).
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

// ── decode ──────────────────────────────────────────────────────────────────
/**
 * Decode an 8-bit, non-interlaced PNG (colorType 0/2/4/6) into straight RGBA.
 * @param {Buffer} buffer
 * @returns {{ width:number, height:number, data:Uint8Array }}  data length = w*h*4
 * @throws {PngOverlayError} on any unsupported shape (caller degrades gracefully).
 */
function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new PngOverlayError('not a PNG (bad signature)');
  }
  let offset = 8;
  let ihdr = null;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buffer.length) throw new PngOverlayError(`truncated chunk ${type}`);
    if (type === 'IHDR') {
      ihdr = {
        width: buffer.readUInt32BE(dataStart),
        height: buffer.readUInt32BE(dataStart + 4),
        bitDepth: buffer[dataStart + 8],
        colorType: buffer[dataStart + 9],
        interlace: buffer[dataStart + 12],
      };
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4; // skip the 4-byte CRC
  }
  if (!ihdr) throw new PngOverlayError('no IHDR chunk');
  if (ihdr.bitDepth !== 8) throw new PngOverlayError(`unsupported bitDepth ${ihdr.bitDepth} (need 8)`);
  if (ihdr.interlace !== 0) throw new PngOverlayError('interlaced PNG unsupported');
  const channels = CHANNELS[ihdr.colorType];
  if (!channels) throw new PngOverlayError(`unsupported colorType ${ihdr.colorType}`);
  if (!idat.length) throw new PngOverlayError('no IDAT data');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width, height } = ihdr;
  const bpp = channels;            // bytes per pixel (8-bit)
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height) throw new PngOverlayError('IDAT shorter than declared size');

  // Unfilter scanlines in place into a contiguous pixel buffer (no filter bytes).
  const px = Buffer.alloc(stride * height);
  let prevRow = Buffer.alloc(stride); // row above (zeros for row 0)
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const row = Buffer.from(raw.subarray(rowStart, rowStart + stride)); // copy (we mutate)
    unfilterRow(row, prevRow, filterType, bpp);
    row.copy(px, y * stride);
    prevRow = row;
  }

  // Expand to straight RGBA.
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++) {
    const s = i * bpp;
    let r;
    let g;
    let b;
    let a = 255;
    if (channels === 1) { r = g = b = px[s]; }              // gray
    else if (channels === 2) { r = g = b = px[s]; a = px[s + 1]; } // gray+alpha
    else if (channels === 3) { r = px[s]; g = px[s + 1]; b = px[s + 2]; } // rgb
    else { r = px[s]; g = px[s + 1]; b = px[s + 2]; a = px[s + 3]; }      // rgba
    rgba[p++] = r; rgba[p++] = g; rgba[p++] = b; rgba[p++] = a;
  }
  return { width, height, data: rgba };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Reverse a single PNG filter (0 None,1 Sub,2 Up,3 Average,4 Paeth) in place. */
function unfilterRow(row, prev, filterType, bpp) {
  const len = row.length;
  switch (filterType) {
    case 0: break;
    case 1: // Sub
      for (let i = bpp; i < len; i++) row[i] = (row[i] + row[i - bpp]) & 0xff;
      break;
    case 2: // Up
      for (let i = 0; i < len; i++) row[i] = (row[i] + prev[i]) & 0xff;
      break;
    case 3: // Average
      for (let i = 0; i < len; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        row[i] = (row[i] + ((left + prev[i]) >> 1)) & 0xff;
      }
      break;
    case 4: // Paeth
      for (let i = 0; i < len; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prev[i];
        const ul = i >= bpp ? prev[i - bpp] : 0;
        row[i] = (row[i] + paeth(left, up, ul)) & 0xff;
      }
      break;
    default:
      throw new PngOverlayError(`unknown filter type ${filterType}`);
  }
}

// ── encode (always 8-bit RGBA, colorType 6, filter 0, non-interlaced) ────────
/**
 * Encode straight RGBA pixels to a PNG Buffer.
 * @param {{width:number, height:number, data:Uint8Array}} img
 * @returns {Buffer}
 */
function encodePng({ width, height, data }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new PngOverlayError(`encodePng: bad dimensions ${width}x${height}`);
  }
  if (!data || data.length !== width * height * 4) {
    throw new PngOverlayError('encodePng: data length must be width*height*4');
  }
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type RGBA
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', ihdrData), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ── resize (alpha-weighted box average; nearest on upscale) ──────────────────
/**
 * Resize straight-RGBA `src` to dstW×dstH. Downscale uses an alpha-weighted box
 * average so a mark on a transparent background loses no edge color to a dark halo
 * (transparent pixels carry no RGB weight). Upscale falls back to nearest-neighbor.
 * @returns {{width:number, height:number, data:Uint8Array}}
 */
function resizeRGBA(src, dstW, dstH) {
  if (dstW <= 0 || dstH <= 0) throw new PngOverlayError(`resize: bad target ${dstW}x${dstH}`);
  const out = new Uint8Array(dstW * dstH * 4);
  const sx = src.width / dstW;
  const sy = src.height / dstH;
  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let aSum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let n = 0;
      for (let yy = y0; yy < y1 && yy < src.height; yy++) {
        for (let xx = x0; xx < x1 && xx < src.width; xx++) {
          const s = (yy * src.width + xx) * 4;
          const a = src.data[s + 3];
          rSum += src.data[s] * a;
          gSum += src.data[s + 1] * a;
          bSum += src.data[s + 2] * a;
          aSum += a;
          n++;
        }
      }
      const d = (y * dstW + x) * 4;
      if (aSum > 0) {
        out[d] = Math.round(rSum / aSum);
        out[d + 1] = Math.round(gSum / aSum);
        out[d + 2] = Math.round(bSum / aSum);
        out[d + 3] = Math.round(aSum / n);
      } else {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0; // fully transparent
      }
    }
  }
  return { width: dstW, height: dstH, data: out };
}

// ── composite (straight-alpha "over") ───────────────────────────────────────
/**
 * Alpha-"over"-composite `overlay` onto `base` at (left, top), mutating base.data.
 * Pixels outside the base are clipped. Straight-alpha math (0..255).
 */
function compositeOver(base, overlay, left, top) {
  for (let y = 0; y < overlay.height; y++) {
    const by = top + y;
    if (by < 0 || by >= base.height) continue;
    for (let x = 0; x < overlay.width; x++) {
      const bx = left + x;
      if (bx < 0 || bx >= base.width) continue;
      const o = (y * overlay.width + x) * 4;
      const sa = overlay.data[o + 3] / 255;
      if (sa === 0) continue;
      const b = (by * base.width + bx) * 4;
      const da = base.data[b + 3] / 255;
      const outA = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        const sc = overlay.data[o + c];
        const dc = base.data[b + c];
        base.data[b + c] = outA > 0 ? Math.round((sc * sa + dc * da * (1 - sa)) / outA) : 0;
      }
      base.data[b + 3] = Math.round(outA * 255);
    }
  }
}

// ── public ──────────────────────────────────────────────────────────────────
const POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

/**
 * Composite a logo asset onto a base image, sized + positioned by a brand policy.
 * The logo width = round(min(baseW, baseH) * scale) so it stays small + balanced
 * across orientations; height keeps the logo's aspect ratio. Margin is the same
 * fraction of the shorter edge.
 *
 * @param {Buffer} baseBuffer  the generated base PNG.
 * @param {Buffer} logoBuffer  the brand asset PNG (the --ref).
 * @param {{position?:string, scale?:number, margin?:number}} [policy]
 * @returns {Buffer} a new PNG buffer with the logo composited.
 * @throws {PngOverlayError} on any decode/encode/geometry failure (caller degrades).
 */
function overlayLogo(baseBuffer, logoBuffer, policy = {}) {
  const position = POSITIONS.has(policy.position) ? policy.position : 'top-left';
  const scale = Number.isFinite(policy.scale) && policy.scale > 0 && policy.scale <= 0.5 ? policy.scale : 0.12;
  const marginFrac = Number.isFinite(policy.margin) && policy.margin >= 0 && policy.margin <= 0.25 ? policy.margin : 0.05;

  const base = decodePng(baseBuffer);
  const logo = decodePng(logoBuffer);

  const shortEdge = Math.min(base.width, base.height);
  const targetW = Math.max(1, Math.round(shortEdge * scale));
  const targetH = Math.max(1, Math.round(logo.height * (targetW / logo.width)));
  const small = resizeRGBA(logo, targetW, targetH);

  const m = Math.round(shortEdge * marginFrac);
  const left = position.endsWith('-right') ? base.width - targetW - m : m;
  const top = position.startsWith('bottom-') ? base.height - targetH - m : m;

  compositeOver(base, small, left, top);
  return encodePng(base);
}

module.exports = {
  overlayLogo,
  decodePng,
  encodePng,
  resizeRGBA,
  compositeOver,
  crc32,
  PngOverlayError,
  POSITIONS,
};
