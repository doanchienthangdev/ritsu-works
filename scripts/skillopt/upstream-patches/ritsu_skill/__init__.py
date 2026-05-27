"""Ritsu-skill SkillOpt environment package.

Added by ritsu-works /evolve v1.1 Sprint 3.5 (capability_id: evolve, supersedes
1.0.0). See .archives/cla/evolve-extend-skillopt/spec.md (promoted to
wiki/capabilities/evolve/spec.md at Phase 8) §19.4.5 for design rationale.

This package is patched in by scripts/skillopt/install-vendor.sh into the
SkillOpt vendor directory at vendor/skillopt/skillopt/envs/ritsu_skill/.
It lives in OUR repo (scripts/skillopt/upstream-patches/ritsu_skill/) so the
SHA-pinned submodule remains a clean read of microsoft/SkillOpt upstream.

The Phase 5 architecture (A-prime) specified the BACKEND (ritsu_file_queue →
session bridge) but did NOT specify the ENV (task loader + rollout + grading).
Sprint 3.5 closes that gap by adding this ritsu_skill env adapter.

Subscription invariant: this package MUST NOT make any HTTP calls. All LLM
calls flow through `skillopt.model.ritsu_file_queue` → file queue → session
bridge → Task() subagent dispatch (subscription billing). See
`scripts/skillopt/UPSTREAM-DEVIATION.md` for the patch contract.
"""
from skillopt.envs.ritsu_skill.adapter import RitsuSkillAdapter

__all__ = ["RitsuSkillAdapter"]
