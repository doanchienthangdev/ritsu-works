// ============================================================================
// scripts/deepask/image-spec.cjs — deepask image canvas/size/crop resolver
// ============================================================================
// Capability `deepask` v1.1 (extend: image formats), 2026-06-01. Pure
// deterministic helper that maps a deepask image --format + --orientation to a
// concrete gpt-image-* API `size` and any post-gen crop needed to hit the
// requested aspect ratio.
//
// WHY a helper: gpt-image native sizes are square (1024x1024), landscape 3:2
// (1536x1024), and portrait 2:3 (1024x1536) — there is NO native 16:9. The
// founder requires img-slide at a literal 16:9. So img-slide generates at the
// widest native landscape (1536x1024) then center-crops to 1536x864 (= 16:9).
// infographics use the native landscape/portrait sizes per --orientation.
//
// Pure functions: no I/O, no side effects. The crop is performed downstream by
// slide-deck.cjs (Pillow); this module only computes the math + contract.
// ============================================================================

'use strict';

const IMAGE_FORMATS = Object.freeze(['infographics', 'img-slide']);
const ORIENTATIONS = Object.freeze(['landscape', 'portrait']);
// gpt-image native generation sizes (square / landscape 3:2 / portrait 2:3 / auto).
const NATIVE_SIZES = Object.freeze(['1024x1024', '1536x1024', '1024x1536', 'auto']);
const DEFAULT_ORIENTATION = 'landscape';

/** Parse "WxH" → {w,h}; throws on malformed. */
function parseSize(size) {
  if (typeof size !== 'string') {
    throw new TypeError(`image-spec: size must be a string, got ${typeof size}`);
  }
  const m = /^(\d+)x(\d+)$/.exec(size);
  if (!m) throw new TypeError(`image-spec: size must be "WxH", got ${JSON.stringify(size)}`);
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (w <= 0 || h <= 0) throw new TypeError(`image-spec: size dims must be > 0, got ${size}`);
  return { w, h };
}

/**
 * Compute a centered crop box that turns a (w×h) image into the largest
 * sub-rectangle matching ratioW:ratioH. Returns {left,top,width,height}.
 * Pure geometry — no rounding surprises (integer floor, centered).
 */
function centeredCropBox(w, h, ratioW, ratioH) {
  if (![w, h, ratioW, ratioH].every((n) => Number.isFinite(n) && n > 0)) {
    throw new TypeError('image-spec: centeredCropBox needs positive finite numbers');
  }
  const targetAR = ratioW / ratioH;
  const srcAR = w / h;
  let cw;
  let ch;
  if (srcAR > targetAR) {
    // source too wide → clamp width
    ch = h;
    cw = Math.round(h * targetAR);
  } else {
    // source too tall (or equal) → clamp height
    cw = w;
    ch = Math.round(w / targetAR);
  }
  cw = Math.min(cw, w);
  ch = Math.min(ch, h);
  const left = Math.floor((w - cw) / 2);
  const top = Math.floor((h - ch) / 2);
  return { left, top, width: cw, height: ch };
}

/**
 * Resolve the image canvas for a deepask image format.
 *
 * @param {object} args
 * @param {string} args.format       'infographics' | 'img-slide'.
 * @param {string} [args.orientation='landscape']  'landscape' | 'portrait'
 *        (IGNORED for img-slide, which is always 16:9 landscape).
 * @returns {{
 *   format: string,
 *   orientation: string,        // effective orientation (img-slide → 'landscape')
 *   apiSize: string,            // size passed to the gpt-image API
 *   ratio: string,              // final aspect ratio label
 *   crop: null | { left:number, top:number, width:number, height:number },
 *   finalSize: string,          // WxH after crop (== apiSize when crop is null)
 * }}
 * @throws {TypeError} on invalid format/orientation.
 */
function resolveImageSpec(args) {
  if (args === null || typeof args !== 'object') {
    throw new TypeError(`image-spec: args must be an object, got ${args === null ? 'null' : typeof args}`);
  }
  const { format } = args;
  let { orientation = DEFAULT_ORIENTATION } = args;

  if (!IMAGE_FORMATS.includes(format)) {
    throw new TypeError(`image-spec: format must be one of [${IMAGE_FORMATS.join(', ')}], got ${JSON.stringify(format)}`);
  }
  if (orientation === undefined || orientation === null) orientation = DEFAULT_ORIENTATION;
  if (!ORIENTATIONS.includes(orientation)) {
    throw new TypeError(`image-spec: orientation must be one of [${ORIENTATIONS.join(', ')}], got ${JSON.stringify(orientation)}`);
  }

  if (format === 'img-slide') {
    // Always 16:9, regardless of requested orientation. Gen 1536x1024 → crop to 1536x864.
    const apiSize = '1536x1024';
    const { w, h } = parseSize(apiSize);
    const crop = centeredCropBox(w, h, 16, 9); // → 1536x864
    return {
      format,
      orientation: 'landscape',
      apiSize,
      ratio: '16:9',
      crop,
      finalSize: `${crop.width}x${crop.height}`,
    };
  }

  // infographics: native landscape (3:2) or portrait (2:3), no crop.
  const apiSize = orientation === 'portrait' ? '1024x1536' : '1536x1024';
  return {
    format,
    orientation,
    apiSize,
    ratio: orientation === 'portrait' ? '2:3' : '3:2',
    crop: null,
    finalSize: apiSize,
  };
}

module.exports = {
  resolveImageSpec,
  centeredCropBox,
  parseSize,
  IMAGE_FORMATS,
  ORIENTATIONS,
  NATIVE_SIZES,
  DEFAULT_ORIENTATION,
};
