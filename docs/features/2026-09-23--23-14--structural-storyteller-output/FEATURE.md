# Structural Storyteller output

Status: Implementing
Approval: On 2026-09-23 the owner approved proceeding from the diagnosis that repeated invalid Storyteller results should be prevented by simpler, truthful output contracts before lowering creative temperature or adding more prompt warnings.

## Intended outcome

The Storyteller spends its model capacity on judgment and fiction rather than reproducing application boilerplate or guessing constraints that code can express exactly. Invalid states that the provider can constrain are absent from the model-facing schema, while application validation, authorization and publication remain authoritative.

This belongs in the POC because two connected Sol openings independently produced an otherwise-useful result containing a zero-delta quantity effect. The prompt already prohibited that value; the transmitted schema still allowed it and the later semantic validator rejected it.

## Representative flow

A Storyteller prepares an opening or consequence containing immediate-action plans. Its strict provider schema permits a quantity change only when the integer is negative or positive. If nothing changes, the Storyteller omits the effect. For a mechanical opening it returns only passage content and plan proposals; the application supplies envelope versions, empty opening evidence, availability state and access to every proposed process. A result conforming to that schema still passes through the existing domain and semantic validators before publication.

An old captured task or stored artifact remains readable under its captured version. A provider refusal, malformed result, semantically unauthorized plan or other invalid output follows the existing bounded hold/repair behavior; schema tightening does not grant retries or alter spending authority.

## Scope and boundaries

- First slice: align generated JSON Schema with the existing nonzero quantity-change invariant for every nested immediate-action outcome.
- Preserve backward parsing of the existing stored effect shape and retain semantic validation as defense in depth.
- Replace the redundant zero-value warning with concise outcome guidance and version newly prepared Storyteller tasks.
- Mechanical openings now use a smaller proposal and deterministic compilation for fixed envelope fields. Fresh plans omit their fixed version and empty evidence; authorized mechanics remain compact references.
- Consequence compaction remains a separate candidate because evidence, continuity, document changes and active-scene control are genuine turn decisions and need a more careful boundary.
- Deferred: temperature changes, a wholesale action DSL, agent exploration tools, provider/model routing changes and live evaluation. Those remain independent variables with their own cost and evidence requirements.

The engine remains creatively unopinionated. Output structure expresses mechanical validity, not pace, tone, danger, option count or preferred story shape; those remain owned by story and Storyteller configuration.

## Acceptance

1. Newly prepared mechanical-opening and consequence schemas encode `quantity.change.v1.delta` as either at most `-1` or at least `1`, including process completion outcomes.
2. The authoritative stored quantity-effect schema continues to read its existing signed-integer shape, while proposal validation still rejects zero.
3. No temperature, model, route, profile, repair allowance or provider-spending setting changes.
4. Existing captured `storyteller.v10` tasks remain parseable; newly prepared tasks identify the changed prompt/output contract as `storyteller.v11`.
5. A mechanical-opening model result contains only `content` and `plans`; code derives its stable envelope, state and activity access without removing prerequisites, outcomes or process mechanics.
6. Legacy v10 provider-shaped opening results remain locally valid for captured repair/replay, but newly transmitted v11 schemas do not expose that boilerplate or activity resumption.
7. Mechanical-opening and consequence prerequisite schemas expose only captured fact/value pairs that are already true and quantity minima the character currently satisfies; the semantic validator remains authoritative.

## Decisions still needed

None for the implemented availability slice. Whether consequence results should omit their remaining derivable envelope fields through a compiler remains an evidence-led follow-up rather than an automatic generalization.

## Owning specifications

[Storyteller runtime](../../technical/storyteller-runtime.md) owns task/result capture and validation. [Context and cost](../../technical/context-and-cost.md) owns request structure and model-attention cost. [Bounded Storyteller effort and cost](../2026-09-19--19-08--bounded-storyteller-cost/FEATURE.md) owns repair and paid-operation limits.
