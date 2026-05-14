#!/usr/bin/env node
/**
 * validate-tier1.js
 * 
 * Validates all Tier 1 YAML files in knowledge/ against JSON Schemas.
 * Used by:
 * - Pre-commit hook (.husky/pre-commit)
 * - CI (.github/workflows/security-check.yml)
 * - Manual: `node scripts/validate-tier1.js`
 *
 * Exit codes:
 *   0 = all valid
 *   1 = validation errors
 *   2 = setup errors
 */

const fs = require('fs');
const path = require('path');

// Try to load deps; install if missing
let yaml, Ajv;
try {
  yaml = require('js-yaml');
  Ajv = require('ajv');
} catch (e) {
  console.error('❌ Missing dependencies. Run: pnpm add -D js-yaml ajv');
  process.exit(2);
}

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');
const SCHEMAS_DIR = path.join(KNOWLEDGE_DIR, 'schemas');

// Map of YAML file -> Schema file
const FILE_TO_SCHEMA = {
  'feature-flags.yaml': 'feature-flags.schema.json',
  'schedules.yaml': 'schedules.schema.json',
  'state-machines.yaml': 'state-machines.schema.json',
  'muse-personas.yaml': 'muse-personas.schema.json',
  'channels.yaml': 'channels.schema.json',
  'event-subscriptions.yaml': 'event-subscriptions.schema.json',
  'event-aggregation.yaml': 'event-aggregation.schema.json',
  'kpi-registry.yaml': 'kpi-registry.schema.json',
  'alert-rules.yaml': 'alert-rules.schema.json',
  'mcp-tools.yaml': 'mcp-tools.schema.json',
  'mcp-roles.yaml': 'mcp-roles.schema.json',
  'link-inference-rules.yaml': 'link-inference-rules.schema.json',
  'data-retention.yaml': 'data-retention.schema.json',
  'locales.yaml': 'locales.schema.json',
  'surface-compliance.yaml': 'surface-compliance.schema.json',
  'ingestion-sources.yaml': 'ingestion-sources.schema.json',
  'ingestion-routing.yaml': 'ingestion-routing.schema.json',
  'founder-rhythm.yaml': 'founder-rhythm.schema.json',
  'cross-tier-invariants.yaml': 'cross-tier-invariants.schema.json',
};

const ajv = new Ajv({ allErrors: true, strict: false });

let totalFiles = 0;
let validFiles = 0;
let invalidFiles = 0;
let missingFiles = 0;

console.log('🔍 Validating Tier 1 YAML files...\n');

for (const [yamlFile, schemaFile] of Object.entries(FILE_TO_SCHEMA)) {
  totalFiles++;
  const yamlPath = path.join(KNOWLEDGE_DIR, yamlFile);
  const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
  
  // Check files exist
  if (!fs.existsSync(yamlPath)) {
    console.log(`  ⚠️  ${yamlFile} — file missing (OK if Wave 1 not done)`);
    missingFiles++;
    continue;
  }
  
  if (!fs.existsSync(schemaPath)) {
    console.log(`  ❌ ${schemaFile} — schema missing!`);
    invalidFiles++;
    continue;
  }
  
  // Load + validate
  let data, schema;
  try {
    data = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (e) {
    console.log(`  ❌ ${yamlFile} — parse error: ${e.message}`);
    invalidFiles++;
    continue;
  }
  
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (valid) {
    console.log(`  ✓  ${yamlFile}`);
    validFiles++;
  } else {
    console.log(`  ❌ ${yamlFile}`);
    for (const err of validate.errors || []) {
      console.log(`       ${err.instancePath || '/'} ${err.message}`);
    }
    invalidFiles++;
  }
}

console.log('\n📊 Summary:');
console.log(`  Valid:   ${validFiles}/${totalFiles}`);
console.log(`  Invalid: ${invalidFiles}`);
console.log(`  Missing: ${missingFiles}`);

if (invalidFiles > 0) {
  console.error('\n❌ Validation failed. Fix errors above.');
  process.exit(1);
}

console.log('\n✅ All present files valid!');
process.exit(0);
