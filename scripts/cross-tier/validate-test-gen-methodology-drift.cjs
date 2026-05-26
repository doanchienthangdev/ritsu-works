#!/usr/bin/env node
/**
 * scripts/cross-tier/validate-test-gen-methodology-drift.cjs
 *
 * @cto NIT T7 (Sprint 4) — Warn-only CI check that compares the SHA-256 of
 * the PHASE 1-5 sections in `06-ai-ops/skills/eval-evo/test-gen/SKILL.md`
 * vs the corresponding section in `~/.claude/CLAUDE.md` (the founder's
 * global rule source of truth for the All-Edge-Cases-Test methodology).
 *
 * Why warn-only: founder updates ~/.claude/CLAUDE.md periodically; the
 * SKILL.md copy is committed-verbatim per @cto T7 (prevent skill body
 * drift from canonical rule). When the source updates, we surface a
 * WARN so founder syncs the SKILL.md quarterly — but we never FAIL CI,
 * since the methodology committed locally is the contract regardless.
 *
 * On drift detected: writes an event to ops.events (via stdout JSON for
 * the orchestrator/cron to capture; this validator itself is read-only
 * + offline).
 *
 * Behavior:
 *   - Computes SHA-256 of the PHASE 1-5 block in test-gen/SKILL.md
 *   - Optionally computes SHA-256 of the equivalent block in
 *     ~/.claude/CLAUDE.md (if file exists locally — only in dev/founder
 *     machine; CI runners don't have this file)
 *   - When the source file is absent (CI runner) → skip with note
 *   - When both present + match → success silently
 *   - When both present + differ → warn + emit drift hint
 *
 * Exit codes:
 *   0 — clean OR source absent (skipped) OR drift detected (warn-only)
 *
 * (Never returns non-zero — this validator is warn-only by design.)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SKILL_PATH = path.join(REPO_ROOT, "06-ai-ops", "skills", "eval-evo", "test-gen", "SKILL.md");
const HOME_CLAUDE_MD = path.join(os.homedir(), ".claude", "CLAUDE.md");

/**
 * Extract the PHASE 1-5 block from a methodology document. Match starts
 * at "PHASE 1 —" or "PHASE 1 -" (em-dash or hyphen) and ends at "Pragmatic
 * Exceptions" (the closing section the methodology always uses).
 */
function extractPhaseBlock(text) {
  // Use [\s\S] to span newlines; non-greedy to stop at first "Pragmatic Exceptions"
  const m = text.match(/PHASE 1\s*[—-]\s*Code Analysis[\s\S]*?Pragmatic Exceptions/);
  return m ? m[0].trim() : null;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function main() {
  if (!fs.existsSync(SKILL_PATH)) {
    console.log("[validate-test-gen-methodology-drift] note: test-gen SKILL.md not found at " + SKILL_PATH);
    process.exit(0);
  }

  const skillText = fs.readFileSync(SKILL_PATH, "utf8");
  const skillBlock = extractPhaseBlock(skillText);
  if (!skillBlock) {
    console.log("[validate-test-gen-methodology-drift] note: PHASE 1-5 block not found in SKILL.md — schema drift");
    process.exit(0);
  }
  const skillHash = sha256(skillBlock);

  // Source comparison only available locally (founder/dev machine)
  if (!fs.existsSync(HOME_CLAUDE_MD)) {
    console.log(`[validate-test-gen-methodology-drift] ok (source CLAUDE.md not on this machine; CI skip): skillHash=${skillHash.slice(0, 16)}…`);
    process.exit(0);
  }

  const homeText = fs.readFileSync(HOME_CLAUDE_MD, "utf8");
  const homeBlock = extractPhaseBlock(homeText);
  if (!homeBlock) {
    console.log("[validate-test-gen-methodology-drift] note: PHASE 1-5 block not found in ~/.claude/CLAUDE.md");
    process.exit(0);
  }
  const homeHash = sha256(homeBlock);

  if (skillHash === homeHash) {
    console.log(`[validate-test-gen-methodology-drift] ok: skill hash matches CLAUDE.md (${skillHash.slice(0, 16)}…)`);
    process.exit(0);
  }

  // Drift detected — WARN (never fail). Print structured payload for cron pickup.
  const payload = {
    event: "ritsu.entity.test_gen_methodology_drift",
    skill_path: SKILL_PATH.replace(REPO_ROOT + "/", ""),
    skill_hash: skillHash,
    home_claude_md_hash: homeHash,
    detected_at: new Date().toISOString(),
    severity: "warn",
    hint: "Founder updated ~/.claude/CLAUDE.md after the last skill body sync. Re-extract the All-Edge-Cases-Test PHASE 1-5 section and update 06-ai-ops/skills/eval-evo/test-gen/SKILL.md to keep parity. Run quarterly.",
  };
  console.log("[validate-test-gen-methodology-drift] WARN drift detected:");
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { extractPhaseBlock, sha256 };
