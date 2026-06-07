'use strict';
/**
 * detect.cjs — source-format detection for /translate (capability `translate`).
 * Pure functions: given a path or URL string, classify the input document format.
 * No I/O — extension/scheme based. Content sniffing is the ingest layer's job.
 */

// canonical source formats the ingest layer understands
const SRC_FORMATS = ['pdf', 'docx', 'pptx', 'html', 'md', 'txt'];

const EXT_MAP = {
  pdf: 'pdf',
  docx: 'docx', doc: 'docx',
  pptx: 'pptx', ppt: 'pptx',
  md: 'md', markdown: 'md', mdx: 'md', mkd: 'md',
  txt: 'txt', text: 'txt',
  html: 'html', htm: 'html', xhtml: 'html',
};

/** Return the canonical source format, or null if unknown. */
function detectFormat(input) {
  if (input == null || typeof input !== 'string') return null;
  const t = input.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return 'html'; // a webpage URL
  // strip query/hash, take last extension
  const clean = t.split('?')[0].split('#')[0];
  const m = clean.match(/\.([A-Za-z0-9]+)\s*$/);
  if (!m) return null;
  return EXT_MAP[m[1].toLowerCase()] || null;
}

/** Is this string a URL we should fetch rather than read from disk? */
function isUrl(input) {
  return typeof input === 'string' && /^https?:\/\//i.test(input.trim());
}

module.exports = { detectFormat, isUrl, SRC_FORMATS };
