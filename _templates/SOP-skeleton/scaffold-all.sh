#!/usr/bin/env bash
# Scaffolds ~80 SOP skeleton dirs from the template.
# Run from repo root. Idempotent — skips dirs that already exist.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

DATE=$(date +%Y-%m-%d)

# Helper: create one SOP scaffold
# Args: pillar_dir sub_pillar sop_code sop_number sop_slug pillar_id owner_role hitl_tier
make_sop() {
    local pillar_dir="$1"
    local sub_pillar="$2"
    local sop_code="$3"
    local sop_number="$4"
    local sop_slug="$5"
    local pillar_id="$6"
    local owner_role="$7"
    local hitl_tier="$8"
    local title="$9"

    local target_dir="$pillar_dir/$sub_pillar/sops/${sop_code}-${sop_number}-${sop_slug}"
    if [ -d "$target_dir" ]; then
        echo "  SKIP exists: $target_dir"
        return 0
    fi

    mkdir -p "$target_dir/steps" "$target_dir/tests"
    sed -e "s|{{SOP_CODE}}|${sop_code}|g" \
        -e "s|{{SOP_NUMBER}}|${sop_number}|g" \
        -e "s|{{SOP_TITLE}}|${title}|g" \
        -e "s|{{PILLAR}}|${pillar_id}|g" \
        -e "s|{{SUB_PILLAR}}|${sub_pillar}|g" \
        -e "s|{{OWNER_ROLE}}|${owner_role}|g" \
        -e "s|{{HITL_TIER}}|${hitl_tier}|g" \
        -e "s|{{DATE}}|${DATE}|g" \
        -e "s|{{TRIGGER_DESCRIPTION}}|TODO — when does this SOP fire?|" \
        -e "s|{{INPUTS_DESCRIPTION}}|TODO — what does this SOP need to run?|" \
        -e "s|{{OUTPUTS_DESCRIPTION}}|TODO — what does this SOP produce?|" \
        _templates/SOP-skeleton/README.md.tmpl > "$target_dir/README.md"

    sed -e "s|{{SOP_SLUG}}|${sop_code}-${sop_number}-${sop_slug}|g" \
        -e "s|{{PILLAR_ID}}|${pillar_id}|g" \
        -e "s|{{OWNER_ROLE}}|${owner_role}|g" \
        -e "s|{{HITL_TIER}}|${hitl_tier}|g" \
        _templates/SOP-skeleton/flow.yaml.tmpl > "$target_dir/flow.yaml"

    touch "$target_dir/steps/.gitkeep" "$target_dir/tests/.gitkeep"
    echo "  Created: $target_dir"
}

# ============================================================
# 03-gtm (17 SOPs)
# ============================================================
make_sop 03-gtm 01-icp-and-segmentation SOP-GTM 001 icp-discovery-from-2-cofounders gtm gtm-orchestrator C "ICP Discovery from 2 Cofounders"

make_sop 03-gtm 02-launch-sequence SOP-GTM 002 stealth-end-pre-launch-checklist gtm gtm-orchestrator C "Stealth-End Pre-Launch Checklist"
make_sop 03-gtm 02-launch-sequence SOP-GTM 003 public-launch-channels gtm gtm-orchestrator C "Public Launch Channels"
make_sop 03-gtm 02-launch-sequence SOP-GTM 004 day-one-monitoring gtm gtm-orchestrator B "Day-One Monitoring"

make_sop 03-gtm 03-distribution-engine SOP-GTM 005 message-test-before-amplify gtm gtm-orchestrator C "Message Test Before Amplify (PG gate)"
make_sop 03-gtm 03-distribution-engine SOP-GTM 006 multi-channel-deploy-AI gtm distribution-deployer C "Multi-Channel Deploy via AI"
make_sop 03-gtm 03-distribution-engine SOP-GTM 007 apollo-outbound-cold-email gtm apollo-outbound-agent C "Apollo Outbound Cold Email"
make_sop 03-gtm 03-distribution-engine SOP-GTM 008 youtube-influencer-discovery gtm gtm-orchestrator B "YouTube Influencer Discovery"
make_sop 03-gtm 03-distribution-engine SOP-GTM 009 channel-attribution-and-doubling-down gtm gtm-orchestrator B "Channel Attribution + Doubling Down"

make_sop 03-gtm 04-funnel-orchestration SOP-GTM 010 landing-to-signup-conversion gtm funnel-analyst B "Landing→Signup Conversion"
make_sop 03-gtm 04-funnel-orchestration SOP-GTM 011 signup-to-first-upload-activation gtm funnel-analyst B "Signup→First Upload Activation"
make_sop 03-gtm 04-funnel-orchestration SOP-GTM 012 free-to-paid-trigger-detection gtm funnel-analyst B "Free→Paid Trigger Detection"
make_sop 03-gtm 04-funnel-orchestration SOP-GTM 013 weekly-funnel-review gtm gtm-orchestrator A "Weekly Funnel Review"

make_sop 03-gtm 05-pmf-instrumentation SOP-GTM 014 pmf-survey-sean-ellis gtm gtm-orchestrator B "PMF Survey (Sean Ellis)"
make_sop 03-gtm 05-pmf-instrumentation SOP-GTM 015 cohort-retention-tracking gtm gtm-orchestrator A "Cohort Retention Tracking"
make_sop 03-gtm 05-pmf-instrumentation SOP-GTM 016 very-disappointed-percentage-tracking gtm gtm-orchestrator A "Very-Disappointed Percentage Tracking"

make_sop 03-gtm 06-collison-install-protocol SOP-GTM 017 hand-recruit-and-onboard-by-name gtm gtm-orchestrator C "Hand-Recruit and Onboard by Name"

# ============================================================
# 04-product (12 SOPs)
# ============================================================
make_sop 04-product 01-wedge-discovery SOP-PRODUCT 001 cofounder-usage-analysis product product-orchestrator A "Cofounder Usage Analysis"
make_sop 04-product 01-wedge-discovery SOP-PRODUCT 002 stranger-recruit-and-watch product product-orchestrator C "Stranger Recruit and Watch (N=10 gate)"
make_sop 04-product 01-wedge-discovery SOP-PRODUCT 003 wedge-feature-naming-and-doubling-down product product-orchestrator B "Wedge Feature Naming + Doubling Down"

make_sop 04-product 02-build-loop SOP-PRODUCT 004 weekly-feature-prioritization product product-orchestrator B "Weekly Feature Prioritization"
make_sop 04-product 02-build-loop SOP-PRODUCT 005 ship-then-listen-cycle product product-orchestrator B "Ship-Then-Listen Cycle"
make_sop 04-product 02-build-loop SOP-PRODUCT 006 rage-detection-from-support product product-orchestrator B "Rage Detection from Support"

make_sop 04-product 03-feedback-pipeline SOP-PRODUCT 007 in-app-nps-collection product feedback-aggregator A "In-App NPS Collection"
make_sop 04-product 03-feedback-pipeline SOP-PRODUCT 008 cancel-flow-feedback product feedback-aggregator A "Cancel-Flow Feedback Capture"
make_sop 04-product 03-feedback-pipeline SOP-PRODUCT 009 feedback-to-roadmap-pipeline product product-orchestrator B "Feedback → Roadmap Pipeline"

make_sop 04-product 04-pricing-experiments SOP-PRODUCT 010 pricing-pull-test product product-orchestrator C "Pricing Pull Test"
make_sop 04-product 04-pricing-experiments SOP-PRODUCT 011 tier-boundary-experiment product product-orchestrator C "Tier Boundary Experiment"

make_sop 04-product 05-ab-test-discipline SOP-PRODUCT 012 ab-test-decision-protocol product experiment-analyst B "A/B Test Decision Protocol"

# ============================================================
# 05-customer (24 SOPs)
# ============================================================
make_sop 05-customer 01-success SOP-CUSTOMER 001 aha-moment-definition-and-tracking customer cs-coach A "Aha Moment Definition + Tracking"
make_sop 05-customer 01-success SOP-CUSTOMER 002 activation-event-instrumentation customer cs-coach B "Activation Event Instrumentation"
make_sop 05-customer 01-success SOP-CUSTOMER 003 day-1-day-7-day-30-cohort-tracking customer cs-coach A "D1/D7/D30 Cohort Tracking"
make_sop 05-customer 01-success SOP-CUSTOMER 004 streak-and-emotional-hook-design customer cs-coach B "Streak and Emotional Hook Design"
make_sop 05-customer 01-success SOP-CUSTOMER 005 mastery-progression-tracking customer cs-coach A "Mastery Progression Tracking (Ritsu-specific)"

make_sop 05-customer 02-onboarding SOP-CUSTOMER 006 collison-install-script customer cs-coach C "Collison Install Script (first 30 paying)"
make_sop 05-customer 02-onboarding SOP-CUSTOMER 007 stuck-user-detection-and-outreach customer cs-coach B "Stuck-User Detection + Outreach"
make_sop 05-customer 02-onboarding SOP-CUSTOMER 008 onboarding-call-runbook customer cs-coach B "Onboarding Call Runbook"
make_sop 05-customer 02-onboarding SOP-CUSTOMER 009 onboarding-script-automation-31plus customer cs-coach B "Onboarding Script Automation (N=31+)"

make_sop 05-customer 03-support SOP-CUSTOMER 010 faq-classification-and-routing customer support-agent B "FAQ Classification and Routing"
make_sop 05-customer 03-support SOP-CUSTOMER 011 support-reply-drafting customer support-agent B "Support Reply Drafting"
make_sop 05-customer 03-support SOP-CUSTOMER 012 escalation-to-founder-criteria customer escalation-router C "Escalation-to-Founder Criteria"
make_sop 05-customer 03-support SOP-CUSTOMER 013 incident-status-page-update customer support-agent C "Incident Status Page Update"

make_sop 05-customer 04-retention SOP-CUSTOMER 014 reactivation-email-on-7-day-silence customer retention-watcher B "Reactivation Email on 7-Day Silence"
make_sop 05-customer 04-retention SOP-CUSTOMER 015 cancel-flow-design customer retention-watcher C "Cancel Flow Design"
make_sop 05-customer 04-retention SOP-CUSTOMER 016 win-back-attempt-protocol customer retention-watcher C "Win-Back Attempt Protocol"
make_sop 05-customer 04-retention SOP-CUSTOMER 017 deep-engagement-celebration-protocol customer retention-watcher A "Deep-Engagement Celebration Protocol"

make_sop 05-customer 05-feedback-and-research SOP-CUSTOMER 018 in-app-nps-collection customer feedback-aggregator A "In-App NPS Collection"
make_sop 05-customer 05-feedback-and-research SOP-CUSTOMER 019 cancel-flow-feedback-capture customer feedback-aggregator A "Cancel-Flow Feedback Capture"
make_sop 05-customer 05-feedback-and-research SOP-CUSTOMER 020 user-interview-recruitment customer feedback-aggregator C "User Interview Recruitment"
make_sop 05-customer 05-feedback-and-research SOP-CUSTOMER 021 feedback-to-product-pipeline customer feedback-aggregator B "Feedback → Product Pipeline"

make_sop 05-customer 06-customer-data SOP-CUSTOMER 022 customer-360-refresh customer customer-lead B "Customer-360 Refresh"
make_sop 05-customer 06-customer-data SOP-CUSTOMER 023 gdpr-account-deletion customer customer-lead "D-Std" "GDPR Account Deletion"
make_sop 05-customer 06-customer-data SOP-CUSTOMER 024 segmentation-by-behavior customer customer-lead B "Segmentation by Behavior"

# ============================================================
# 09-founder (21 SOPs)
# ============================================================
make_sop 09-founder 01-cognition SOP-FOUNDER 001 weekly-top-idea-audit founder founder-coach A "Weekly Top-Idea Audit"
make_sop 09-founder 01-cognition SOP-FOUNDER 002 nile-perch-detection founder founder-coach A "Nile Perch Detection"
make_sop 09-founder 01-cognition SOP-FOUNDER 003 makers-schedule-protection founder gps A "Maker's Schedule Protection"
make_sop 09-founder 01-cognition SOP-FOUNDER 004 decision-log-discipline founder gps A "Decision Log Discipline"
make_sop 09-founder 01-cognition SOP-FOUNDER 005 reversible-vs-irreversible-router founder gps A "Reversible vs Irreversible Router"

make_sop 09-founder 02-charter-discipline SOP-FOUNDER 006 weekly-charter-reread founder gps A "Weekly Charter Re-read"
make_sop 09-founder 02-charter-discipline SOP-FOUNDER 007 charter-violation-detection founder gps B "Charter Violation Detection"
make_sop 09-founder 02-charter-discipline SOP-FOUNDER 008 charter-evolution-pr-protocol founder gps C "Charter Evolution PR Protocol"

make_sop 09-founder 03-hitl-flow SOP-FOUNDER 009 telegram-hitl-bot-config founder hitl-router C "Telegram HITL Bot Config"
make_sop 09-founder 03-hitl-flow SOP-FOUNDER 010 tier-c-d-batch-and-clear founder hitl-router A "Tier C/D Batch + Clear"
make_sop 09-founder 03-hitl-flow SOP-FOUNDER 011 override-magic-phrase-discipline founder hitl-router A "Override Magic-Phrase Discipline"
make_sop 09-founder 03-hitl-flow SOP-FOUNDER 012 d-max-cooldown-protocol founder hitl-router "D-MAX" "D-MAX Cooldown Protocol"

make_sop 09-founder 04-weekly-review SOP-FOUNDER 013 friday-review-template founder gps A "Friday Review Template"
make_sop 09-founder 04-weekly-review SOP-FOUNDER 014 week-ahead-pillar-priorities founder gps A "Week-Ahead Pillar Priorities"
make_sop 09-founder 04-weekly-review SOP-FOUNDER 015 monthly-charter-and-budget-reset founder gps B "Monthly Charter + Budget Reset"

make_sop 09-founder 05-health SOP-FOUNDER 016 weekly-energy-tracking founder health-tracker A "Weekly Energy Tracking"
make_sop 09-founder 05-health SOP-FOUNDER 017 mandatory-rest-window founder health-tracker A "Mandatory Rest Window"
make_sop 09-founder 05-health SOP-FOUNDER 018 burnout-early-warning-signs founder health-tracker A "Burnout Early Warning Signs"

make_sop 09-founder 06-learning SOP-FOUNDER 019 weekly-reading-budget founder gps A "Weekly Reading Budget"
make_sop 09-founder 06-learning SOP-FOUNDER 020 monthly-skill-gap-audit founder gps A "Monthly Skill Gap Audit"
make_sop 09-founder 06-learning SOP-FOUNDER 021 quarterly-deep-research-week founder gps B "Quarterly Deep-Research Week"

# ============================================================
# 10-metrics (20 SOPs)
# ============================================================
make_sop 10-metrics 01-kpi-registry SOP-METRICS 001 kpi-definition-template metrics metrics-curator B "KPI Definition Template"
make_sop 10-metrics 01-kpi-registry SOP-METRICS 002 kpi-ownership-mapping metrics metrics-curator B "KPI Ownership Mapping"
make_sop 10-metrics 01-kpi-registry SOP-METRICS 003 kpi-deprecation-protocol metrics metrics-curator C "KPI Deprecation Protocol"

make_sop 10-metrics 02-pmf-instrumentation SOP-METRICS 004 sean-ellis-very-disappointed-tracking metrics metrics-curator A "Sean Ellis Very-Disappointed Tracking"
make_sop 10-metrics 02-pmf-instrumentation SOP-METRICS 005 cohort-retention-week-1-week-4 metrics metrics-curator A "Cohort Retention W1-W4"
make_sop 10-metrics 02-pmf-instrumentation SOP-METRICS 006 nps-collection-and-aggregation metrics metrics-curator A "NPS Collection + Aggregation"
make_sop 10-metrics 02-pmf-instrumentation SOP-METRICS 007 100-paying-who-love-composite-metric metrics metrics-curator A "100-Paying-Who-Love Composite Metric (THE tile)"

make_sop 10-metrics 03-dashboards SOP-METRICS 008 founder-monday-dashboard metrics metrics-curator A "Founder Monday Dashboard (5-tile)"
make_sop 10-metrics 03-dashboards SOP-METRICS 009 cross-pillar-weekly-review-board metrics metrics-curator A "Cross-Pillar Weekly Review Board"
make_sop 10-metrics 03-dashboards SOP-METRICS 010 pillar-health-rollup metrics metrics-curator A "Pillar Health Rollup (G/Y/R)"

make_sop 10-metrics 04-alerting SOP-METRICS 011 alert-rule-yaml-format metrics alert-router C "Alert Rule YAML Format"
make_sop 10-metrics 04-alerting SOP-METRICS 012 alert-routing-by-severity metrics alert-router C "Alert Routing by Severity"
make_sop 10-metrics 04-alerting SOP-METRICS 013 alert-fatigue-audit metrics alert-router B "Alert Fatigue Audit (monthly)"

make_sop 10-metrics 05-experiment-measurement SOP-METRICS 014 experiment-design-checklist metrics experiment-analyst B "Experiment Design Checklist"
make_sop 10-metrics 05-experiment-measurement SOP-METRICS 015 significance-and-lift-calculation metrics experiment-analyst B "Significance + Lift Calculation"
make_sop 10-metrics 05-experiment-measurement SOP-METRICS 016 experiment-stop-and-decide-protocol metrics experiment-analyst B "Experiment Stop-and-Decide Protocol"

make_sop 10-metrics 06-revenue-and-cost-views SOP-METRICS 017 mrr-growth-rate-weekly metrics metrics-curator A "MRR Growth Rate (weekly)"
make_sop 10-metrics 06-revenue-and-cost-views SOP-METRICS 018 blended-cac-ltv-by-channel metrics metrics-curator B "Blended CAC/LTV by Channel"
make_sop 10-metrics 06-revenue-and-cost-views SOP-METRICS 019 ai-ops-cost-per-task-trend metrics metrics-curator B "AI-Ops Cost Per-Task Trend"
make_sop 10-metrics 06-revenue-and-cost-views SOP-METRICS 020 runway-projection-monthly metrics metrics-curator B "Runway Projection (monthly)"

echo
echo "DONE. Total scaffolded:"
find 03-gtm 04-product 05-customer 09-founder 10-metrics -path '*/sops/SOP-*' -name flow.yaml 2>/dev/null | wc -l
