'use strict';
// Named exception classes for the resolver engine.
// Per .archives/cla/resolver/spec.md §11 + brainstorm 07-error-rescue-map.md (41 named exceptions).
// Catch by class name; no catch-all per architect findings.

class ResolverError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
  }
}

// === Loader errors ===
class RegistryNotFound extends ResolverError {
  constructor(path) { super('RegistryNotFound', `Resolver registry.yaml not found at ${path}`, { path }); }
}
class RegistryParseError extends ResolverError {
  constructor(path, cause) { super('RegistryParseError', `Failed to parse ${path}: ${cause}`, { path, cause }); }
}
class RegistrySchemaMismatch extends ResolverError {
  constructor(version, supported) { super('RegistrySchemaMismatch', `schema_version '${version}' not supported (got: ${supported.join(', ')})`, { version, supported }); }
}
class RouteFileMissing extends ResolverError {
  constructor(path) { super('RouteFileMissing', `Route file declared in registry but missing on disk: ${path}`, { path }); }
}
class RouteFileParseError extends ResolverError {
  constructor(path, cause) { super('RouteFileParseError', `YAML parse failed for ${path}: ${cause}`, { path, cause }); }
}
class RouteSchemaInvalid extends ResolverError {
  constructor(id, errors) { super('RouteSchemaInvalid', `Route ${id} failed schema validation`, { id, errors }); }
}
class AdapterSourceMissing extends ResolverError {
  constructor(adapter, source) { super('AdapterSourceMissing', `Adapter ${adapter} references missing source ${source}`, { adapter, source }); }
}
class AdapterTemplateBindingError extends ResolverError {
  constructor(adapter, field) { super('AdapterTemplateBindingError', `Adapter ${adapter} template references undefined source field ${field}`, { adapter, field }); }
}
class AdapterOutputInvalid extends ResolverError {
  constructor(adapter, cause) { super('AdapterOutputInvalid', `Adapter ${adapter} produced malformed route: ${cause}`, { adapter, cause }); }
}
class RouteIdCollision extends ResolverError {
  constructor(id, files) { super('RouteIdCollision', `Route id '${id}' defined in multiple files: ${files.join(', ')}`, { id, files }); }
}
class RecipientNotFound extends ResolverError {
  constructor(kind, slug) { super('RecipientNotFound', `Recipient ${kind}/${slug} not found on filesystem or Tier 1`, { kind, slug }); }
}
class RecipientKindUnknown extends ResolverError {
  constructor(kind) { super('RecipientKindUnknown', `Recipient kind '${kind}' not in valid enum`, { kind }); }
}
class ResolverDown extends ResolverError {
  constructor(reason) { super('ResolverDown', `Resolver unavailable: ${reason}`, { reason }); }
}

// === Query errors ===
class InvalidTrigger extends ResolverError {
  constructor(reason) { super('InvalidTrigger', `Invalid trigger: ${reason}`, { reason }); }
}
class TriggerTooLong extends ResolverError {
  constructor(len, max) { super('TriggerTooLong', `Trigger length ${len} exceeds max ${max}`, { len, max }); }
}
class KeywordPatternInvalid extends ResolverError {
  constructor(pattern, cause) { super('KeywordPatternInvalid', `Keyword pattern '${pattern}' invalid: ${cause}`, { pattern, cause }); }
}
class CallerRoleUndefined extends ResolverError {
  constructor() { super('CallerRoleUndefined', 'MCP_CALLER_ROLE env var not set; defaulting to founder'); }
}
class CallerRoleUnknown extends ResolverError {
  constructor(role) { super('CallerRoleUnknown', `Caller role '${role}' not in governance/ROLES.md`, { role }); }
}
class PlanStepBroken extends ResolverError {
  constructor(stepIndex, recipient) { super('PlanStepBroken', `Plan step ${stepIndex} references unknown recipient: ${JSON.stringify(recipient)}`, { stepIndex, recipient }); }
}
class PlanCyclic extends ResolverError {
  constructor(cycle) { super('PlanCyclic', `Composition plan contains cycle: ${cycle.join(' → ')}`, { cycle }); }
}

// === Semantic errors (v1.1) ===
class SemanticUnavailable extends ResolverError {
  constructor(reason) { super('SemanticUnavailable', `Semantic fallback unavailable: ${reason}`, { reason }); }
}
class EmbeddingTimeout extends ResolverError {
  constructor(ms) { super('EmbeddingTimeout', `OpenAI embedding call timed out after ${ms}ms`, { ms }); }
}
class EmbeddingRateLimit extends ResolverError {
  constructor() { super('EmbeddingRateLimit', 'OpenAI embedding rate limited'); }
}
class EmbeddingProviderError extends ResolverError {
  constructor(status, body) { super('EmbeddingProviderError', `OpenAI embedding 5xx (${status}): ${body}`, { status, body }); }
}
class EmbeddingMalformed extends ResolverError {
  constructor(detail) { super('EmbeddingMalformed', `Malformed embedding response: ${detail}`, { detail }); }
}
class PgVectorConnectionDown extends ResolverError {
  constructor(cause) { super('PgVectorConnectionDown', `pgvector connection unavailable: ${cause}`, { cause }); }
}
class PgVectorTimeout extends ResolverError {
  constructor() { super('PgVectorTimeout', 'pgvector query timed out'); }
}
class SemanticHitStale extends ResolverError {
  constructor(routeId) { super('SemanticHitStale', `Semantic hit references stale route ${routeId}`, { routeId }); }
}

// === Command errors ===
class UnknownSubcommand extends ResolverError {
  constructor(cmd, valid) { super('UnknownSubcommand', `Unknown subcommand '${cmd}'. Valid: ${valid.join(', ')}`, { cmd, valid }); }
}
class MissingPositional extends ResolverError {
  constructor(name, usage) { super('MissingPositional', `Missing required argument <${name}>. Usage: ${usage}`, { name, usage }); }
}
class InvalidFlagValue extends ResolverError {
  constructor(flag, value, valid) { super('InvalidFlagValue', `Flag --${flag}=${value} invalid. Valid: ${valid.join(', ')}`, { flag, value, valid }); }
}

// === Sync errors ===
class NotInGitRepo extends ResolverError {
  constructor(cwd) { super('NotInGitRepo', `Must run from within git repo (cwd: ${cwd})`, { cwd }); }
}
class GitPushDenied extends ResolverError {
  constructor(branch) { super('GitPushDenied', `git push failed for ${branch} (permission/auth)`, { branch }); }
}
class GHCLIMissing extends ResolverError {
  constructor() { super('GHCLIMissing', 'gh CLI not installed. Run: brew install gh'); }
}
class GHAuthExpired extends ResolverError {
  constructor() { super('GHAuthExpired', 'gh auth expired. Run: gh auth login'); }
}
class WorkingTreeDirty extends ResolverError {
  constructor(files) { super('WorkingTreeDirty', `Working tree dirty (${files} files). Stash or commit first.`, { files }); }
}
class SyncLocked extends ResolverError {
  constructor(pid, age) { super('SyncLocked', `Sync lock held by PID ${pid} (age ${age}s)`, { pid, age }); }
}
class FilesystemReadOnly extends ResolverError {
  constructor(path) { super('FilesystemReadOnly', `Cannot write to ${path} (permission denied)`, { path }); }
}
class ValidatorMissing extends ResolverError {
  constructor(name) { super('ValidatorMissing', `Validator script missing: ${name}`, { name }); }
}
class ValidatorCrash extends ResolverError {
  constructor(name, cause) { super('ValidatorCrash', `Validator ${name} crashed: ${cause}`, { name, cause }); }
}

// === Audit errors ===
class OpsAuditWriteFailed extends ResolverError {
  constructor(cause) { super('OpsAuditWriteFailed', `ops.resolver_decisions write failed: ${cause}`, { cause }); }
}
class AuditPayloadTooLarge extends ResolverError {
  constructor(bytes, max) { super('AuditPayloadTooLarge', `Audit payload ${bytes} bytes exceeds max ${max}`, { bytes, max }); }
}
class OpsAuditDenied extends ResolverError {
  constructor(role) { super('OpsAuditDenied', `Role ${role} lacks tier2_schemas_write: [ops.resolver_decisions]`, { role }); }
}

module.exports = {
  ResolverError,
  // Loader
  RegistryNotFound, RegistryParseError, RegistrySchemaMismatch,
  RouteFileMissing, RouteFileParseError, RouteSchemaInvalid,
  AdapterSourceMissing, AdapterTemplateBindingError, AdapterOutputInvalid,
  RouteIdCollision, RecipientNotFound, RecipientKindUnknown, ResolverDown,
  // Query
  InvalidTrigger, TriggerTooLong, KeywordPatternInvalid,
  CallerRoleUndefined, CallerRoleUnknown, PlanStepBroken, PlanCyclic,
  // Semantic (v1.1)
  SemanticUnavailable, EmbeddingTimeout, EmbeddingRateLimit,
  EmbeddingProviderError, EmbeddingMalformed,
  PgVectorConnectionDown, PgVectorTimeout, SemanticHitStale,
  // Command
  UnknownSubcommand, MissingPositional, InvalidFlagValue,
  // Sync
  NotInGitRepo, GitPushDenied, GHCLIMissing, GHAuthExpired,
  WorkingTreeDirty, SyncLocked, FilesystemReadOnly,
  ValidatorMissing, ValidatorCrash,
  // Audit
  OpsAuditWriteFailed, AuditPayloadTooLarge, OpsAuditDenied,
};
