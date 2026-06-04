// ============================================================================
// scripts/dataviz/lib/theme.cjs — the McKinsey data-viz theme (+ --style override)
// ============================================================================
// Capability `dataviz` v0.1. PURE. buildTheme(resolvedStyle, themeName) -> theme.
//
// The McKinsey aesthetic, encoded as concrete tokens (grounded in 3 real reports +
// the dataviz-design-brief): one-highlight-only, restrained neutrals, data-ink
// minimalism. The `--style` design-system brand palette/type OVERRIDES the McKinsey
// tokens (precedence: brand > legibility > McKinsey art-direction > decoration) —
// the STRUCTURE ⊥ BRAND split. Structural rules (gridlines off, zero baseline,
// direct labels) stay constant; only palette + fonts are overridden by --style.
//
// @cto must-fix #1: resolveStyle returns {mode, tokens:{colors:{<arbitrary keys>},
// typography:{<role>:{fontFamily,...}}}}. We read `resolved.tokens.colors` (NOT
// `resolved.colors`), GUARD every key read with a fallback chain, and treat each
// typography role as an OBJECT (fontFamily) or a string. A non-Ritsu design system
// has different color keys — never index an unguarded key.
// @cto must-fix #10: gen.cjs catches StyleResolveError and passes a plain/null
// resolved here; buildTheme degrades to classic on anything but mode==='styled'.
// ============================================================================

'use strict';

// Classic McKinsey theme (default) — exact hex from the dataviz-design-brief.
const CLASSIC = Object.freeze({
  highlight: '#005EB8',   // primary blue — THE data point that matters
  neutral1: '#A2AAAD',    // base (de-emphasized) series
  neutral2: '#C0C5C9',    // lighter de-emphasis
  ink: '#222222',         // titles / key labels
  inkMuted: '#6B7280',    // source / footnotes / units
  gridline: '#E6E8EA',    // hairline only
  bg: '#FFFFFF',          // pure white, no fills
  accent: '#418FDE',      // teal — semantic "winning / one-to-one" accent
  amber: '#F3C13A',       // warm signal (one-off / warning only)
  headingFont: 'Georgia, "Times New Roman", serif',  // Bower fallback (non-redistributable)
  bodyFont: 'Arial, Helvetica, sans-serif',          // McKinsey Sans fallback
});

// 2024 rebrand variant (approximate — no official hex published; brighter blue, used even more sparingly).
const REBRAND = Object.freeze({
  ...CLASSIC,
  highlight: '#1A4FB0',
  accent: '#2B6CB0',
});

// Structural constants (the data-ink minimalism — NEVER altered by --style; the ⊥ split).
const STRUCTURE = Object.freeze({
  gridlines: false,        // off by default; horizontal hairline only if values unreadable
  axisDomain: false,       // drop the value-axis line (direct-label instead)
  ticks: false,            // no tick marks
  legend: false,           // direct labels, never a legend
  directLabels: true,
  barZeroBaseline: true,   // bar/column value axis MUST start at zero (no truncation)
  oneHighlightOnly: true,
});

const THEMES = { mckinsey: CLASSIC, 'mckinsey-rebrand': REBRAND };

/** A typography role is {fontFamily,...} OR a string — extract the family safely. */
function familyOf(role, fallback) {
  if (!role) return fallback;
  if (typeof role === 'string') return role.trim() || fallback;
  if (typeof role === 'object' && typeof role.fontFamily === 'string' && role.fontFamily.trim()) return role.fontFamily.trim();
  return fallback;
}

/** First defined hex among the candidate keys of an arbitrary colors map. */
function pick(colors, keys, fallback) {
  if (colors && typeof colors === 'object') {
    for (const k of keys) {
      const v = colors[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return fallback;
}

/**
 * Build the render theme.
 * @param {object|null} resolvedStyle  the resolveStyle() result (or null/plain → classic).
 * @param {string} themeName  'mckinsey' (default) | 'mckinsey-rebrand'.
 * @returns {{ theme: object, warnings: string[] }}
 */
function buildTheme(resolvedStyle, themeName) {
  const warnings = [];
  const base = THEMES[themeName] || CLASSIC;
  // Default McKinsey series palette: highlight first, then neutrals (one-loud rule),
  // then the accents — the renderer applies `highlight` to the designated index only.
  const theme = {
    name: THEMES[themeName] ? themeName : 'mckinsey',
    ...base,
    series: [base.highlight, base.neutral1, base.neutral2, base.accent, base.amber],
    ...STRUCTURE,
    styled: false,
    styleName: null,
  };

  const styled = resolvedStyle && resolvedStyle.mode === 'styled' && resolvedStyle.tokens && typeof resolvedStyle.tokens === 'object';
  if (resolvedStyle && resolvedStyle.warning) warnings.push(String(resolvedStyle.warning));
  if (!styled) {
    if (resolvedStyle && resolvedStyle.mode && resolvedStyle.mode !== 'plain') {
      warnings.push(`--style "${resolvedStyle.name || '?'}" not usable (mode=${resolvedStyle.mode}) → classic McKinsey theme`);
    }
    return { theme, warnings };
  }

  // mode==='styled' → OVERRIDE palette + fonts (guarded, arbitrary keys).
  const colors = resolvedStyle.tokens.colors && typeof resolvedStyle.tokens.colors === 'object' ? resolvedStyle.tokens.colors : {};
  const typo = resolvedStyle.tokens.typography && typeof resolvedStyle.tokens.typography === 'object' ? resolvedStyle.tokens.typography : {};

  theme.highlight = pick(colors, ['primary', 'accent', 'chart1', 'brand'], base.highlight);
  theme.accent = pick(colors, ['accent', 'chart2', 'secondary'], base.accent);
  theme.ink = pick(colors, ['foreground', 'ink', 'text'], base.ink);
  theme.inkMuted = pick(colors, ['muted-foreground', 'mutedForeground', 'muted', 'inkMuted'], base.inkMuted);
  theme.bg = pick(colors, ['background', 'bg'], base.bg);
  theme.gridline = pick(colors, ['border', 'gridline', 'muted'], base.gridline);
  theme.neutral1 = pick(colors, ['chart3', 'neutral1', 'muted'], base.neutral1);
  theme.neutral2 = pick(colors, ['chart4', 'neutral2'], base.neutral2);

  // Series palette: prefer the design-system chart ramp (chart1..chart5) if present.
  const chartRamp = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5']
    .map((k) => (typeof colors[k] === 'string' && colors[k].trim() ? colors[k].trim() : null))
    .filter(Boolean);
  theme.series = chartRamp.length >= 2 ? chartRamp : [theme.highlight, theme.neutral1, theme.neutral2, theme.accent, theme.amber];

  theme.headingFont = familyOf(typo.display || typo.heading, base.headingFont);
  theme.bodyFont = familyOf(typo.body, base.bodyFont);

  theme.styled = true;
  theme.styleName = resolvedStyle.name || null;
  return { theme, warnings };
}

module.exports = { buildTheme, CLASSIC, REBRAND, STRUCTURE, THEMES, familyOf, pick };
