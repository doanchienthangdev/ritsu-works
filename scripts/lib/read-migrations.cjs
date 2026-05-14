// Shared reader for supabase/migrations/. Returns concatenated DDL text + a
// few derived projections that L2 validators all need.
//
// Until v1.0b ships a live-DB snapshot, this concatenated text IS the
// authoritative "what the DB should look like" reference.

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('./load-invariants.cjs');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function newestMigrationFile() {
  const files = listMigrationFiles();
  return files.length === 0 ? null : files[files.length - 1];
}

function concatenatedMigrations() {
  return listMigrationFiles()
    .map((f) => `-- @file ${f}\n` + fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n\n');
}

// Returns array of {schema, table, file} tuples — every CREATE TABLE statement
// across all migrations. Handles ops.*, metrics.*, public (no schema prefix).
function extractCreateTables() {
  const all = concatenatedMigrations();
  const lines = all.split('\n');
  let currentFile = '';
  const tables = [];
  const re = /^\s*CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:([a-z_][a-z0-9_]*)\.)?([a-z_][a-z0-9_]*)\s*\(/i;
  for (const line of lines) {
    const fileMatch = line.match(/^-- @file (.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const m = line.match(re);
    if (m) {
      tables.push({
        schema: m[1] || 'public',
        table: m[2],
        file: currentFile,
      });
    }
  }
  return tables;
}

// Returns array of {schema, table, column, file} for every column declared in
// CREATE TABLE. Best-effort line parser; does NOT handle multi-line column defs
// or comma-only-on-following-line edge cases. Good enough for v1.0a sanity.
function extractColumnsByTable() {
  const all = concatenatedMigrations();
  const lines = all.split('\n');
  let currentFile = '';
  let currentSchema = null;
  let currentTable = null;
  let depth = 0;
  const columns = [];
  for (const rawLine of lines) {
    const fileMatch = rawLine.match(/^-- @file (.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const line = rawLine.replace(/--.*$/, '').trim();
    if (!currentTable) {
      const m = rawLine.match(
        /^\s*CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:([a-z_][a-z0-9_]*)\.)?([a-z_][a-z0-9_]*)\s*\(/i
      );
      if (m) {
        currentSchema = m[1] || 'public';
        currentTable = m[2];
        depth = 1;
        // capture column on same line if present
        const inline = rawLine.substring(rawLine.indexOf('(') + 1).trim();
        captureColumn(columns, currentSchema, currentTable, inline, currentFile);
      }
      continue;
    }
    // inside a CREATE TABLE
    for (const ch of line) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
    }
    captureColumn(columns, currentSchema, currentTable, line, currentFile);
    if (depth <= 0) {
      currentSchema = null;
      currentTable = null;
      depth = 0;
    }
  }
  return columns;
}

function captureColumn(columns, schema, table, line, file) {
  // Skip empty, constraint, or pure-paren lines.
  if (!line) return;
  if (/^CONSTRAINT\b/i.test(line)) return;
  if (/^PRIMARY KEY\b/i.test(line)) return;
  if (/^UNIQUE\b/i.test(line)) return;
  if (/^FOREIGN KEY\b/i.test(line)) return;
  if (/^CHECK\b/i.test(line)) return;
  if (/^\)/.test(line)) return;
  // Column line is "name type ...". First token = column name (must start with letter).
  const m = line.match(/^([a-z_][a-z0-9_]*)\b/i);
  if (!m) return;
  // Filter common SQL keywords that might lead a line.
  const reserved = ['SELECT', 'INSERT', 'CREATE', 'ALTER', 'WITH', 'RETURNS', 'LANGUAGE', 'AS'];
  if (reserved.includes(m[1].toUpperCase())) return;
  columns.push({ schema, table, column: m[1].toLowerCase(), file });
}

module.exports = {
  MIGRATIONS_DIR,
  listMigrationFiles,
  newestMigrationFile,
  concatenatedMigrations,
  extractCreateTables,
  extractColumnsByTable,
};
