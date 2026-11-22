# ADI03 | Per-scene policy, entitlement and model-routing provenance inspector

**State: PROPOSED / NOT CURSOR-READY.** Read-only historical *explanation* of effective execution policy. Distinct from [CFG01 resolver](../../policy-finance/2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md), [CFG02 policy editor](../../policy-finance/2026-11-22--cfg02-admin-policy-management/CHANGE.md) and [AI03 prompt/round inspector](../../agent-runtime/2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md).

## Why

The owner wants a staff member to understand **which configuration governed a particular scene and why**, even if the subscription, payer, preference, model availability, route price, defaults or published recipe later changed. Scenes within one story may legitimately use different creative profiles, model route eligibility and limits. An old scene's actual execution configuration must not be overwritten by today's active tier. A model **attempt** can differ from a scene when a scene involved multiple rounds, no inference, or held work.

## Expected experience

For each scene, show a chronology of operation/mission/attempt **effective-policy snapshots**, including:
- which profile/recipe revision and creative preferences were active at admission;
- entitlement/grant/beneficiary, payer, applicable account/story/platform and mission caps, usage-window state and allowance outcomes *where actually verified*;
- the chosen internal provider/model and price version, model capability/route eligibility, sampling parameters/context/tool/round/output/timeout limits, captured hashes and source;
- the **limiting reasons** from policy intersection, what a user was allowed to select (e.g. “Fast” or “Thoughtful” public-facing tier) versus the *internal* provider route, and any later hold/unknown provider spend;
- compare scene 4 and scene 7, or show historical captured policy versus **a separate, clearly labeled hypothetical current-policy preview** without changing history.

**No automatic user-visible model name.** Public UX should describe product-level service quality/options, not promise a permanently fixed provider/model, internal prices or exact algorithm. Internal model identity remains inspectable by sufficiently authorized Engineering/LiveOps/Finance personas. The exact public labels and commercial promises are **product decisions**, not automatically selected here.

## Safety and historical truth

Never infer that current subscription status or model catalog explains an old completed execution. Each attempt's actual captured provider/price/authorization survives later plan changes. Existing uncertain financial liability remains unknown/held, never “free”. Role-specific projections: Support may learn verified account eligibility/restriction and safe reason, Product sees aggregate/eligible cohort configuration and rollout, Engineering sees exact policy/model traces as authorized, Finance sees relevant spend; raw prompts, unrelated identity and secrets remain AI03/private or entirely prohibited. Audit sensitive reads and prohibit tenant/case crossing, protected record enumeration and cache leaks.

## Owner and dependencies

Source-map after [CFG01](../../policy-finance/2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md) defines immutable effective policy and [WR11](../../../open/2026-11-22--wr11-authorized-provider-continuation/CHANGE.md) proves real admission. Use an authorized `@offscreen/admin` projection of **captured** SQL policy/provenance, not a second policy resolver in React. Presentation belongs in the selected `/control` console next to ADI01 and links to AI03, not an unbounded raw configuration editor. CFG02 remains the only proposed policy mutation UI.

## Acceptance

Two scenes with distinct frozen policy revisions remain attributed correctly after an operator changes active defaults; expired entitlement affects a **new** admission but cannot retroactively rewrite an old record. Internal model name visible only to eligible staff; player sees only selected product-facing label. No inference from absence: if old price/policy evidence was never retained, explicitly unknown. No execution, database schema, or paid tests authorized.
