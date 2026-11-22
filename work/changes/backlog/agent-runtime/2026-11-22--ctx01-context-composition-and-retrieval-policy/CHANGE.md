# CTX01 | Explicit, inspectable context composition and retrieval strategy

**State: PROPOSED / PLANNER-GATED.** This is a distinct agent-quality/runtime behavior Change, not the [CFG01](../../policy-finance/2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md) numeric/entitlement resolver, [AI02](../2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md) exact provenance archive, or [EV01](../../quality-evaluation/2026-11-22--ev01-centwise-agent-evaluation/CHANGE.md) evaluation ledger.

## Why it exists

The current `packages/storyteller/src/tasks/writer-round-request.ts` compiler starts with a brief system instruction and structured source/Library/profile/skill hashes plus prior tool-result summaries. A pinned Library does **not** mean the model already read its contents. The owner must be able to answer: what information entered this round, what was merely available through tools, what was omitted for cost, and why? Improving that selection is a different outcome from permitting a larger token cap.

## Desired outcome

A clearly documented, versioned **context-assembly strategy** builds each opening/continuation/research prompt from immutable source pins and **purpose-specific sections**: instructions/role, current scene/task, player choices, canonical world/characters, relevant previous passages, retrieved Library evidence, tool permissions, output contract and prior tool summaries. Each section records source, priority, token/byte estimate, included/omitted/truncated status and reason. Required canon/safety sections cannot be silently truncated to save money; optional evidence/history is bounded by effective policy.

The resolver is controlled by typed **Recipe** revisions (CFG01) and validated against real model-route limits; no arbitrary prompt scripts or mutable live Library head in a historical fork. Workdesk retrieval remains explicit and logged, not hidden in an “LLM remembers everything” claim. Keep prompts versioned so prior captured hashes remain reproducible. Distinguish model-visible text from tool-accessible sources. AI02 should archive the *actual* composed request and section manifest, while Chamber/EV01 can compare alternate composition policies for $0 using preserved fixture responses.

## Provisional boundaries

Likely future owners: `packages/storyteller/src/tasks/writer-round-request.ts` and existing prompt/capture schemas, `packages/story-engine/src/storyteller` context gatherers/Library/tool selection, and a pure manifest/packing component **inside existing owner packages**. Do not add another configuration engine, change SQL/Temporal task ownership or expand the permissioned Library surface. A new npm package requires a real measured cross-owner need, not aesthetic isolation.

## Proof / planner gates

On identical pinned inputs and compiler version, generate byte/hash-identical request; changing a recipe creates an explicit new version and manifest. Verify omission/priority handling near token limits, no future-scene leakage on fork, missing required source holds, tool grants never fabricated, and correct actual provider-visible bytes. Compare free deterministic/scored fixture cases before any model call. Must follow WR11 source reconciliation and share design with AI01/AI02 and CFG01; no concurrent edits of the Writer compiler. No paid testing authorized.
