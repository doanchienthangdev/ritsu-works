'use strict';
/**
 * scripts/resolver-v2/catalog-loader.cjs — parse recipients/*.md → in-memory index.
 *
 * Per spec.md §3 catalog format:
 *   ## <recipient-id>
 *   **Kind:** <kind>
 *   **When to use:** <NL description>
 *   **Invoke:** <code>
 *   **Composes with:** (optional list)
 *   - <id>
 *   **Role scope:** comma-separated
 *   **Status:** active|stub|deprecated
 *   **Pillar:** (optional)
 *
 * Parser is STRICT: malformed entries throw CatalogParseError to fail-fast.
 *
 * Cache: per-process, invalidated by mtime change on any file.
 *
 * Public API:
 *   loadCatalog(opts?) → { recipients, byId, byKind, loadedAt, mtimes, totalCount }
 *   parseFile(filePath, content) → Recipient[]
 *   parseEntry(headerLine, bodyLines) → Recipient
 *   invalidateCache() → void
 */

const fs = require('fs');
const path = require('path');
const E = require('./errors.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');
const CATALOG_FILES = [
  'skills.md', 'commands.md', 'agents.md', 'personas.md', 'mcps.md',
  // v2.1 NEW kinds — composition expansion
  'wikis.md', 'sops.md', 'capabilities.md', 'workflows.md', 'schedules.md', 'hooks.md',
  // v2.2 NEW kinds — context sources
  'pages.md', 'views.md', 'metrics.md', 'runbooks.md', 'external-sources.md',
];

const REQUIRED_FIELDS = ['Kind', 'When to use', 'Invoke', 'Status'];
const OPTIONAL_LIST_FIELDS = ['Composes with', 'Aliases'];
const OPTIONAL_SCALAR_FIELDS = ['Role scope', 'Status', 'Pillar', 'Disambiguator'];

let _cache = null;

function nowMs() { return Date.now(); }

function mtimeOf(p) {
  try { return fs.statSync(p).mtimeMs; }
  catch (_e) { return null; }
}

/**
 * Parse a single field value.
 * Examples:
 *   "skill" → "skill"
 *   "founder, cs-coach, customer-lead" → ["founder", "cs-coach", "customer-lead"]
 *   "*" → ["*"]
 */
function parseScalar(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

function parseCommaList(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse a single recipient entry from header line + body lines.
 * Header: "## skill/customer-onboarding"
 * Body: array of lines (one per line, no trailing newline)
 *
 * Returns: { id, kind, when_to_use, invoke, composes_with, role_scope, status, pillar, aliases, disambiguator }
 * Throws: MissingRequiredField if required fields absent.
 */
function parseEntry(headerLine, bodyLines, sourceFile) {
  const idMatch = headerLine.match(/^##\s+(.+)\s*$/);
  if (!idMatch) {
    throw new E.CatalogParseError(sourceFile, `Malformed header: "${headerLine}"`);
  }
  const id = idMatch[1].trim();
  if (!id || id.includes(' ')) {
    throw new E.CatalogParseError(sourceFile, `Invalid recipient ID: "${id}"`);
  }

  const fields = {};
  const listFields = {};
  let currentListField = null;

  // Iterate lines collecting fields
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];

    // Field line: **Field:** value
    const fieldMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1].trim();
      const fieldValue = fieldMatch[2].trim();

      if (OPTIONAL_LIST_FIELDS.includes(fieldName)) {
        // Begin a list — value should be empty; following lines are list items
        currentListField = fieldName;
        listFields[fieldName] = [];
        // If inline content (e.g. "**Aliases:** foo, bar"), parse as comma-list
        if (fieldValue) {
          listFields[fieldName] = parseCommaList(fieldValue);
          currentListField = null;
        }
      } else {
        // Scalar field
        fields[fieldName] = fieldValue;
        currentListField = null;
      }
      continue;
    }

    // List item under current list field: "- foo"
    const listItemMatch = line.match(/^\s*-\s+(.+)$/);
    if (listItemMatch && currentListField) {
      listFields[currentListField].push(listItemMatch[1].trim());
      continue;
    }

    // Other content (paragraph text continuing "When to use:") — append to last scalar
    if (line.trim() && fields['When to use'] !== undefined && !line.startsWith('**')) {
      fields['When to use'] = (fields['When to use'] + ' ' + line.trim()).trim();
    }
  }

  // Validate required fields
  for (const req of REQUIRED_FIELDS) {
    if (!(req in fields)) {
      throw new E.MissingRequiredField(id, req);
    }
  }

  return {
    id,
    kind: parseScalar(fields['Kind']),
    when_to_use: parseScalar(fields['When to use']),
    invoke: parseScalar(fields['Invoke']),
    composes_with: listFields['Composes with'] || [],
    aliases: listFields['Aliases'] || [],
    role_scope: parseCommaList(fields['Role scope'] || '*'),
    status: parseScalar(fields['Status']),
    pillar: fields['Pillar'] ? parseScalar(fields['Pillar']) : null,
    disambiguator: fields['Disambiguator'] ? parseScalar(fields['Disambiguator']) : null,
    _source: { file: sourceFile },
  };
}

/**
 * Parse a single catalog file → array of Recipients.
 * Skips header/metadata sections; only `## <id>` headings start entries.
 */
function parseFile(filePath, content) {
  const lines = content.split('\n');
  const entries = [];
  let inHeader = true;
  let currentHeader = null;
  let currentBody = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip leading file header lines until first `## ` heading
    if (line.match(/^##\s+/)) {
      // Flush previous entry
      if (currentHeader) {
        try {
          entries.push(parseEntry(currentHeader, currentBody, filePath));
        } catch (e) {
          if (e instanceof E.MissingRequiredField || e instanceof E.CatalogParseError) throw e;
          throw new E.CatalogParseError(filePath, `Entry parse error: ${e.message}`);
        }
      }
      currentHeader = line;
      currentBody = [];
      inHeader = false;
    } else if (!inHeader) {
      // Stop at next `# ` (h1) — file boundary
      if (line.match(/^#\s+/)) {
        if (currentHeader) {
          entries.push(parseEntry(currentHeader, currentBody, filePath));
          currentHeader = null;
          currentBody = [];
        }
        break;
      }
      currentBody.push(line);
    }
    // else: skip header lines (file-level metadata before first ## entry)
  }

  // Flush last entry
  if (currentHeader) {
    try {
      entries.push(parseEntry(currentHeader, currentBody, filePath));
    } catch (e) {
      if (e instanceof E.MissingRequiredField || e instanceof E.CatalogParseError) throw e;
      throw new E.CatalogParseError(filePath, `Final entry parse error: ${e.message}`);
    }
  }

  return entries;
}

/**
 * Load full catalog index. Cached per-process; mtime-invalidates.
 *
 * @param {Object} [opts]
 * @param {string} [opts.recipientsDir]  override default knowledge/recipients/
 * @param {Array<string>} [opts.files]   override default catalog file list
 * @param {boolean} [opts.skipCache]     force fresh load
 *
 * @returns {Object} {
 *   recipients: Recipient[],
 *   byId: Map<string, Recipient>,
 *   byKind: Map<string, Recipient[]>,
 *   totalCount: number,
 *   loadedAt: number,
 *   mtimes: { [filePath]: number }
 * }
 */
function loadCatalog(opts = {}) {
  const dir = opts.recipientsDir || DEFAULT_RECIPIENTS_DIR;
  const files = opts.files || CATALOG_FILES;

  if (!fs.existsSync(dir)) {
    throw new E.CatalogDown(`knowledge/recipients/ absent at ${dir}`);
  }

  // Cache check
  if (!opts.skipCache && _cache && _cache.dir === dir) {
    let allFresh = true;
    for (const [fp, mtime] of Object.entries(_cache.mtimes)) {
      if (mtimeOf(fp) !== mtime) { allFresh = false; break; }
    }
    if (allFresh) return _cache;
  }

  const recipients = [];
  const mtimes = {};
  const seenIds = new Map(); // id → file (for duplicate detection)

  for (const file of files) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) {
      // Soft skip — missing file is not error; allows incremental adoption
      continue;
    }
    mtimes[fp] = mtimeOf(fp);
    const content = fs.readFileSync(fp, 'utf-8');
    const entries = parseFile(fp, content);
    for (const e of entries) {
      if (seenIds.has(e.id)) {
        throw new E.DuplicateRecipientId(e.id, [seenIds.get(e.id), fp]);
      }
      seenIds.set(e.id, fp);
      recipients.push(e);
    }
  }

  const byId = new Map(recipients.map(r => [r.id, r]));
  const byKind = new Map();
  for (const r of recipients) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind).push(r);
  }

  _cache = {
    dir,
    recipients,
    byId,
    byKind,
    totalCount: recipients.length,
    loadedAt: nowMs(),
    mtimes,
  };
  return _cache;
}

function invalidateCache() { _cache = null; }

module.exports = {
  loadCatalog,
  parseFile,
  parseEntry,
  invalidateCache,
  CATALOG_FILES,
  REQUIRED_FIELDS,
};
