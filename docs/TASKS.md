# Technical-design handoff — product baseline v0.01

Updated: 2026-09-17. Product baseline v0.01 is ready for technical design, then an executable MVP (D061). The public repository now versions this baseline and runs documentation checks. No game implementation, runtime stack, deployment or paid model experiment is claimed.

## Start here

Read [release scope](product/foundations/scope-and-release-plan.md), then the owners needed for the next design choice. Do not reread all documents or populate the optional library. The stable concept is story-first character life, authoritative mechanics, sparse persistent entities, meaningful optional intervention and low-cost unattended progression.

## Short design-gate list

These are remaining choices, not reasons to reopen the product. Recommendations below are assistant proposals until chosen; record consequential selections before implementing affected behavior.

| Gate | Proposed starting point | Owner |
| --- | --- | --- |
| Supported profile and rules | One local-life profile; one reusable routine and a bounded set of incident effects. Choose D&D edition/source subset and explicitly identify time/livelihood extensions. No combat or arbitrary generated rules prerequisite. | RULES-F01, WORLD-F05, WORK-F01 |
| Input and handoff | Contextual actions first is the smallest experiment; free text/hybrid remains open. Define interruption, taking control and behavior when direct control receives no new command. Do not silently restore guaranteed autonomous obedience. | PLAY-F01, CTRL-001–007, GOAL-F02 |
| Clock, windows and recovery | Running delegated windows are settled by D057. Choose pace, window duration, option invalidation, pause/resume and outage reconciliation. Existing INTERVENTION-001–006 supply draft defaults. | TIME-F01, DOC-INTERVENTION |
| Initial agency and risk | Define permitted automatic actions, trait/dice influence, supported loss and no-legal-fallback behavior. Prefer a bounded effect set with an explainable continuation; pause only for an explicit policy or genuine blocked state. | DOC-AUTONOMOUS-RISK, GOAL-F02, ROUTINE-008 |
| Surface, phone channel and access | Compact story-centered web interaction; validate one phone delivery/response route. Slack and push are candidates. Choose local prototype versus hosted demo sequencing and account/access scope. | DOC-MOMENT-TO-MOMENT-PLAY, DOC-INTERVENTION |
| AI limits and experiment settings | Separate setup/ongoing budgets; bounded calls/tools/repairs; explicit exhaustion fallback. Choose numeric caps and profile values rather than copying illustrative prices, wages or deadlines. | AI-COST-001–008, AI-F01 |

Grid size/neighborhood, wages, durations, recurrence syntax, and initial content are reversible experiment settings. Make them explicit and testable; do not present assistant-picked values as Denis-approved balance. A public release additionally needs rules/content provenance and appropriate security.

## Compact technical documents to derive

Recommended grouping, not mandatory file count or architecture:

1. Architecture and authority: state ownership, persistence, background progression, deployment/access boundary and key tradeoffs.
2. Domain and interaction contracts: supported actions/effects, timing, interruption, permissions, idempotency, stale responses and recovery.
3. AI contract and evaluation: generator/storyteller responsibilities, relevant context, allowed tools/outputs, validation, budgets, fallback and continuity tests.
4. Build/test plan: one runnable slice, setup, automated acceptance cases and demo evidence.

Include only what makes the first slice buildable. Pick technologies by this workload and Denis's senior fullstack goals, not by the number of services or agent frameworks.

## Build sequence

Use the incremental checkpoints and completion checks in DOC-RELEASE-SCOPE. Bring up state and a routine, add the bounded storyteller immediately after that core, then integrate the selected phone path and harden the full loop. Preserve authority/pause/accounting from the first increment; later polish does not excuse corrupt state.

Experiment with a short playable loop and inspect actual outcomes, prompts/context, admitted versus rejected proposals, latency and costs. A seeded/mock provider path can make tests reproducible, but must not be presented as a live storyteller demonstration. Paid calls require an explicitly chosen development budget.

## Baseline maintenance

D061 closes open-ended product expansion for this pass. Keep remaining alternatives in their existing topic owners; record only decisions necessary for the next slice. Change the product when a real implementation/playtest finding justifies it, preserving the reason. Git is authoritative for project documentation and future code; the prior Drive documents are retained as a migration snapshot. Do not copy private career material into a public repository.
