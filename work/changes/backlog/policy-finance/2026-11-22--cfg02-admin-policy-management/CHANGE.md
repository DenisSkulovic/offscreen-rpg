# CFG02 | Admin governance for versioned Storyteller runtime policies

**State: DEFERRED PROPOSAL / NOT READY / no execution authorization.** Recorded because the owner explicitly wants product/business operators to tune Storyteller configuration without editing code, but this must **follow CFG01 resolver and financial proofs**. Source intent: [2026-11-22 minutes](../../../../sessions/2026-11-22.md#6-strongly-configurable-runtime-policies-not-hard-coded-subscription-logic).

## Desired later outcome

Authorized Admin user can **list, create draft, compare with active revision, validate, preview affected task/tier/scenario, publish, activate and roll back** versioned execution recipes and model route policies, with a full audit trail and non-bypassable upper safety constraints. Publishing a default changes future mission admission only. Previously pinned policies, funded attempts and player stories remain attributable to their original revisions. Admin must be able to answer which plan/config produced a problematic scene and why an effective limit was reached.

## Preserve separation

- Config governance **does not** grant money or provider dispatch permission. Activation is not an override of OwnerGrant, limits or operator kill switch.
- Entitlement/customer plan packages, run-level funding, model provider credentials, usage windows, creative story settings and task recipes are separate owner domains. No monolithic free/premium JSON object.
- Admin capability checks, audit, case/campaign visibility, dry-run impact analysis and redaction must use the existing `@offscreen/admin` and Nest Admin identities; don't put privileged policy routes into player API or outer Lab Chamber.
- Chamber may reference draft version(s) in isolated experiments, but those drafts may never become production live policy by running a lab test.
- External business tooling, subscriptions, revenue plans, billing integration and payment credentials remain out of scope.

## Pre-implementation decisions

1. Ratify CFG01 persistent versioned schema/limit resolver and deterministic effective policy trace; forbid runtime mutations in this Change.
2. Source-map Admin capabilities/roles, staff action auditing, SQL draft/activate transaction and current Admin controller split after HR01.
3. Define who can draft vs approve vs activate, separation of duties for raising monetary ceilings and staging changes; protect emergency kill switch; guarantee default safe behavior.
4. Define compatibility and rollback semantics across in-flight missions, model pricing revision, task recipe and customer entitlement, including positive/negative tests with synthetic tiers.
5. Minimal UI first; do not build a generic configuration framework or speculative dashboard.

**Next:** remain Deferred until CFG01 source/acceptance is demonstrated and the owner elects to begin operator UI. This shallow record prevents the long-term commercial/admin vision from being lost.
