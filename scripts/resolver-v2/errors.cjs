'use strict';
/**
 * scripts/resolver-v2/errors.cjs — typed exception classes for resolver v2.
 *
 * All errors carry a stable `.code` for programmatic handling + `.kind` for
 * error categorization (input/state/io/validation).
 */

class ResolverError extends Error {
  constructor(message, code, kind) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.kind = kind;
  }
}

// ==========================================================================
// Input errors (caller's fault)
// ==========================================================================

class InvalidTrigger extends ResolverError {
  constructor(message) {
    super(message, 'INVALID_TRIGGER', 'input');
  }
}

class TriggerTooLong extends ResolverError {
  constructor(actualLen, maxLen) {
    super(`Trigger exceeds max length: ${actualLen} > ${maxLen}`, 'TRIGGER_TOO_LONG', 'input');
    this.actualLen = actualLen;
    this.maxLen = maxLen;
  }
}

class InvalidKindFilter extends ResolverError {
  constructor(filterKind, validKinds) {
    super(`Unknown kind filter "${filterKind}". Valid: ${validKinds.join(', ')}`, 'INVALID_KIND_FILTER', 'input');
    this.filterKind = filterKind;
    this.validKinds = validKinds;
    // NOTE: do not overwrite this.kind (set by parent to 'input' for error category)
  }
}

class HallucinatedRecipient extends ResolverError {
  constructor(recipientId, availableIds) {
    super(`LLM returned recipient ID "${recipientId}" not in catalog`, 'HALLUCINATED_RECIPIENT', 'validation');
    this.recipientId = recipientId;
    this.availableCount = availableIds ? availableIds.length : 0;
  }
}

class InvalidLlmResponse extends ResolverError {
  constructor(reason, raw) {
    super(`LLM response not parseable: ${reason}`, 'INVALID_LLM_RESPONSE', 'validation');
    this.raw = (raw || '').slice(0, 500);
  }
}

// ==========================================================================
// State errors (system not configured correctly)
// ==========================================================================

class CatalogDown extends ResolverError {
  constructor(detail) {
    super(`Catalog not available: ${detail}`, 'CATALOG_DOWN', 'state');
  }
}

class CatalogFileMissing extends ResolverError {
  constructor(filePath) {
    super(`Catalog file missing: ${filePath}`, 'CATALOG_FILE_MISSING', 'state');
    this.filePath = filePath;
  }
}

class CatalogParseError extends ResolverError {
  constructor(filePath, detail) {
    super(`Catalog parse error in ${filePath}: ${detail}`, 'CATALOG_PARSE_ERROR', 'state');
    this.filePath = filePath;
    this.detail = detail;
  }
}

class DuplicateRecipientId extends ResolverError {
  constructor(id, files) {
    super(`Duplicate recipient ID "${id}" found in: ${files.join(', ')}`, 'DUPLICATE_RECIPIENT_ID', 'state');
    this.id = id;
    this.files = files;
  }
}

class MissingRequiredField extends ResolverError {
  constructor(recipientId, field) {
    super(`Recipient ${recipientId} missing required field: ${field}`, 'MISSING_REQUIRED_FIELD', 'state');
    this.recipientId = recipientId;
    this.field = field;
  }
}

// ==========================================================================
// I/O errors (transient/external)
// ==========================================================================

class AuditWriteFailed extends ResolverError {
  constructor(detail) {
    super(`Audit write failed: ${detail}`, 'AUDIT_WRITE_FAILED', 'io');
  }
}

class SyncLocked extends ResolverError {
  constructor(lockAgeMs) {
    super(`Sync lock held (age ${lockAgeMs}ms)`, 'SYNC_LOCKED', 'io');
    this.lockAgeMs = lockAgeMs;
  }
}

class WorkingTreeDirty extends ResolverError {
  constructor(detail) {
    super(`Working tree has uncommitted changes: ${detail}`, 'WORKING_TREE_DIRTY', 'io');
  }
}

// ==========================================================================
// Constants
// ==========================================================================

const VALID_KINDS = ['skill', 'command', 'agent', 'persona', 'mcp', 'wiki', 'sop', 'capability'];
const VALID_MODES = ['A', 'B', 'C'];
const VALID_DECISIONS = ['dispatch_silently', 'surface_candidates', 'no_match', 'role_denied'];

module.exports = {
  ResolverError,
  InvalidTrigger,
  TriggerTooLong,
  InvalidKindFilter,
  HallucinatedRecipient,
  InvalidLlmResponse,
  CatalogDown,
  CatalogFileMissing,
  CatalogParseError,
  DuplicateRecipientId,
  MissingRequiredField,
  AuditWriteFailed,
  SyncLocked,
  WorkingTreeDirty,
  VALID_KINDS,
  VALID_MODES,
  VALID_DECISIONS,
};
