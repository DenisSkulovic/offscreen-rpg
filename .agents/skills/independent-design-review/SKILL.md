---
name: independent-design-review
description: Challenge a proposed Offscreen RPG feature or technical design independently against product intent, external expert knowledge, current repo evidence and failure cases before Cursor implements it. Read-only by default.
---

# Independent design challenge (architect / adversarial reviewer)

**Use when** the first proposed design came from a coding model, the scope is substantial, the owner wants strong architecture, or an apparently clean plan makes a consequential tradeoff. This is a _design_ review, not source-only investigation or review of a completed diff.

1. **Anchor authority.** For portfolio modernization, independently assess the _desired target architecture first_ under [target-driven renewal](../../rules/target-driven-renewal.md). Then read its gap audit and proposed `CHANGE.md`/PLAN, plus affected permanent product/technical contracts. Check whether the source was made the standard by accident. Distinguish decided outcome, proposal, unverified assumptions and current implementation evidence. An implementation cannot grant itself authority just because it exists.
2. **Bring professional design knowledge.** Select a relevant manual from [the engineering knowledge library](../../knowledge/README.md), _especially_ [architecture alternatives](../../knowledge/architecture-decision-space.md) when design boundaries are disputed. Challenge the range of options, why each exists, changed constraints, maintenance/evolution and cross-system interactions. Use first-party documentation when a framework behavior is consequential. Failure cases are one part of the critique, not its entire content; no external reference overrides the approved product.
3. **Construct genuine alternatives.** Consider keeping the existing boundary with one repair; a focused improvement; and a changed ownership/design only when credible. Identify which assumptions each alternative needs, how it fails, and what evidence would favor it. Include a counterexample that would weaken your preferred option. "Make services" and "keep things simple" are not designs.
4. **Attack the hidden failure paths.** Depending on scope, question concurrency, stale writes, retries, absence/pause, security, UX empty/error states, model hallucinations treated as authoritative data, and whether another abstraction increases token and maintenance cost. For UI, involve `player-experience-design` or `frontend-engineering`; for SQL/Temporal, `transactional-correctness-review`.
5. **Converge.** Return a clear recommended decision, one serious rejected option and why, source anchors, updated product/technical headings to author, negative acceptance, and the smallest verifiable implementation slice. Say _stop/research further_ when an essential contract is unresolved.

### Output contract (short)

`Decision | Why it beats the strongest alternative | Broken assumptions / counterevidence | Permanent spec edits | First executor slice | Evidence still missing`.

Do not fill an extra 20-page design file, alter working code, invent external approval, or create generic review findings. The independent reviewer should add **new judgment**, not paraphrase a Claude-generated proposal. Never dispatch in-game inference or spend a coding subscription for routine design questions already answered by the current sources.
