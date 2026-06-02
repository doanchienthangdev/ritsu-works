// ============================================================================
// scripts/image/lib/compose.cjs — image-platform deterministic prompt composer
// ============================================================================
// Capability `image-platform` v0.2 (extend: first-class --style design-system +
// --art-style genre). PURE/deterministic — resolves the two style axes OUT-OF-BAND
// (no LLM) and assembles the final image prompt:
//
//   [user prompt] + [BRAND block (--style)] + [GENRE block (--art-style)]
//
// This makes --style a first-class /image feature (parity with /deepask's design-
// system layer) but DETERMINISTIC: gen.cjs calls composePrompt() so the brand
// palette/typography/personality from the resolved DESIGN.md is injected the same
// way every run — no model variance. Precedence (carried from deepask/image-compose):
// brand core palette/logo/type > genre > art-direction > content density.
//
// Never throws on a style/art-style miss — degrades to plain + a warning (mirrors
// gen.cjs's never-crash, warn-don't-drop discipline). resolveStyle hard-fails on a
// non-interactive cache MISS (AD-3); we catch that and render plain + warn.
// ============================================================================

'use strict';

const { resolveStyle } = require('../../design-system/resolve-style.cjs');
const { resolveArtStyle } = require('../../deepask/art-style.cjs');

/** Build a byte-stable BRAND style block from a resolved design system (or '' when plain). */
function buildBrandBlock(resolved) {
  if (!resolved || resolved.mode !== 'styled' || !resolved.tokens) return '';
  const t = resolved.tokens;
  const colors = t.colors && typeof t.colors === 'object' ? t.colors : {};
  const typo = t.typography && typeof t.typography === 'object' ? t.typography : {};
  const parts = [];
  const primary = colors.primary || colors.accent || colors['primary-deep'];
  if (typeof primary === 'string') parts.push(`primary ${primary}`);
  if (typeof colors.accent === 'string' && colors.accent !== primary) parts.push(`accent ${colors.accent}`);
  if (typeof colors.background === 'string') parts.push(`background ${colors.background}`);
  if (typeof colors.foreground === 'string') parts.push(`foreground/text ${colors.foreground}`);
  const font = [typo.display, typo.heading, typo.body, typo.font, typo['font-family']]
    .find((f) => typeof f === 'string');
  if (font) parts.push(`${font} typography`);
  const palette = parts.length ? parts.join(', ') : 'its defined palette';
  let block = `Render in the "${resolved.name}" brand design system — ${palette}.`;
  let personality = typeof t.description === 'string' ? t.description.trim().split('\n')[0] : '';
  // Drop a parenthetical that looks like a source path / URL (provenance noise — never belongs
  // in an image prompt), tidy the punctuation, then cap at a word boundary.
  personality = personality.replace(/\s*\([^)]*[/\\][^)]*\)/g, '').replace(/\s+([.,;])/g, '$1').trim();
  if (personality.length > 200) personality = `${personality.slice(0, 200).replace(/\s+\S*$/, '')}…`;
  if (personality) block += ` Brand personality: ${personality}.`;
  block += ' The brand core palette, logo and typography take precedence over any other styling.';
  return block;
}

/** Build a GENRE block from a resolved --art-style (or '' when plain). `assets` is the lever. */
function buildGenreBlock(resolved) {
  if (!resolved || resolved.mode !== 'styled' || !resolved.genre) return '';
  const g = resolved.genre;
  const parts = [];
  if (g.assets) parts.push(`draw: ${g.assets}`);
  if (g.layout) parts.push(`composition: ${g.layout}`);
  if (g.tone) parts.push(`mood: ${g.tone}`);
  if (g.display_type) parts.push(`headline: ${g.display_type}`);
  if (g.secondary_palette) parts.push(`SECONDARY accent ONLY: ${g.secondary_palette}`);
  if (!parts.length) return '';
  return `Artistic genre "${resolved.name}" — ${parts.join('; ')}. `
    + '(Genre contributes composition/assets/mood + a SECONDARY accent only; the brand palette above still wins.)';
}

/**
 * Compose the final image prompt = user prompt + brand block + genre block.
 * Deterministic; resolves design context out-of-band. Never throws.
 * @param {object} a
 * @param {string} a.prompt          the (possibly --enhance'd) user prompt.
 * @param {string} [a.style]         --style brand design-system name.
 * @param {string} [a.artStyle]      --art-style genre id.
 * @param {boolean} [a.interactive=false]  resolveStyle may fetch-on-miss only when true.
 * @returns {{ prompt, warnings:string[], style:{mode,name}, artStyle:{mode,name}, brandBlock, genreBlock }}
 */
function composePrompt({ prompt, style, artStyle, interactive = false } = {}) {
  const warnings = [];
  let styleResolved = { mode: 'plain', name: null, tokens: null };
  let artResolved = { mode: 'plain', name: null, genre: null };

  if (style) {
    try {
      styleResolved = resolveStyle(style, { interactive });
      if (styleResolved.mode === 'needs-download') {
        warnings.push(`--style "${style}" is not cached → rendering plain (run \`/design-system add ${style}\` first)`);
        styleResolved = { mode: 'plain', name: null, tokens: null };
      } else if (styleResolved.mode === 'plain' && styleResolved.warning) {
        warnings.push(`--style "${style}": ${styleResolved.warning} → rendering plain`);
      }
    } catch (e) {
      warnings.push(`--style "${style}" could not be resolved (${e.message || e}) → rendering plain`);
      styleResolved = { mode: 'plain', name: null, tokens: null };
    }
  }

  if (artStyle) {
    try {
      artResolved = resolveArtStyle(artStyle);
    } catch (e) {
      warnings.push(`--art-style "${artStyle}" could not be resolved (${e.message || e}) → no genre`);
      artResolved = { mode: 'plain', name: null, genre: null };
    }
  }

  const brandBlock = buildBrandBlock(styleResolved);
  const genreBlock = buildGenreBlock(artResolved);
  const composed = [String(prompt == null ? '' : prompt).trim(), brandBlock, genreBlock].filter(Boolean).join('\n\n');

  return {
    prompt: composed,
    warnings,
    style: { mode: styleResolved.mode, name: styleResolved.name || null },
    artStyle: { mode: artResolved.mode, name: artResolved.name || null },
    brandBlock,
    genreBlock,
  };
}

module.exports = { composePrompt, buildBrandBlock, buildGenreBlock };
