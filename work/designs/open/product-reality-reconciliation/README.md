# Product reality reconciliation | feasibility, coherence, and authority

**State:** Investigation and proposed decisions. **Not selected product canon; not a Change authorization.** Source: clean `main@ec8c652c5b0a` (2026-11-18 lean export). Product documents: 31 Markdown files, approximately 33,206 whitespace-separated words, 1,969 lines. The evidence and work/changes archives were excluded from this snapshot.

## Core diagnosis

The current wiki's **authority and implementation-status hygiene are materially better** than the owner's initial impression suggests. The DOC05–DOC41 and WIKI waves separated many proposals from selected owners. The missing plane is **product feasibility/validity**. A selected target is not an engineering impossibility, but neither is it validated by being selected; apparent internal consistency is not a demonstrated playable experience.

The system must keep these questions separate:

- **Desirability:** Would anyone actually enjoy this experience, and why?
- **Product coherence:** Can its mechanics coexist without making interaction, consent, or pacing nonsensical?
- **Technical feasibility:** Is there a bounded, source-correct implementation and fallback?
- **Economic feasibility:** Can 10, 30, 100 and 1,000 accepted turns stay inside an actual funding envelope, including failures and background work?
- **Evidence maturity:** Was it merely discussed, designed, source-observed, tested offline, trialed with a provider, or human-played for enough time to know?

A heading can be authoritative as a *design preference* and still lack evidence of feasibility. A selected POC design can be implemented but unplayable. A good deterministic component can work perfectly while the AI DM produces dull or incoherent scenes.

## What to read

| Question | Owner |
| --- | --- |
| What is the concise diagnosis? | [Executive summary](EXECUTIVE.md) |
| What was checked, by every product page? | [AUDIT](AUDIT.md) |
| Which individual claims deserve reclassification, and why? | [CLAIM REGISTER](CLAIM-REGISTER.md) |
| What combinations of ambitions create architectural/product conflicts? | [COHERENCE](COHERENCE.md) |
| What do actual observed packets and modeled costs imply? | [ECONOMICS](ECONOMICS.md) |
| How should source-of-truth authorship and gatekeeping change? | [EDITORIAL POLICY](EDITORIAL-POLICY.md) |
| What exact order should the coding agent follow? | [PVAL change packets](../../../changes/open/) (read the [repository handoff](HANDOFF.md) before selecting any packet) |

## Default judgment, subject to owner ratification

**Protect the causal spine:** player intention; deterministic authority and time; committed effects; authored, bounded choices; source-grounded narrative; persisted original passages; explicit cost/consent boundaries. This is the promising differentiator.

**Do not make universality the POC acceptance criterion.** First prove one deeply constrained solo story, one actor, a few supported action families, no new map representation, no shared-player concurrency, a small amount of relevant persistence, and limited model tasks. A memorable 20–30-turn session is a better validation target than a 200-page fantasy-world specification.

**Keep aspirations as aspirations.** Shared worlds, hundred-player interaction, generic 3D cube maps, arbitrarily shaped forms with fully general mechanics, open-ended autonomy, deep multi-month NPC relationships, exhaustive world lore, and Storyteller-owned rich appearance need independent evidence and coherent bounded proposals before entering release obligations.

## Proposed bounded Change sequence (none is selected)

| Packet | Scope | Gate |
| --- | --- | --- |
| [PVAL01](../../../changes/open/2026-11-18--pval01-product-source-of-truth-warning/CHANGE.md) | Documentation truth / feasibility warning in two front doors | Owner selection |
| [PVAL02](../../../changes/open/2026-11-18--pval02-first-playable-scope-separation/CHANGE.md) | Distinct solo vs cooperative playability milestones | **Blocked until explicit scope ratification** |
| [PVAL03](../../../changes/open/2026-11-18--pval03-grand-mechanics-maturity/CHANGE.md) | World/map/autonomy risk classification | Owner selection, preserve invariants |
| [PVAL04](../../../changes/open/2026-11-18--pval04-storyteller-viability-gates/CHANGE.md) | Memory and narrative quality / cost evidence gates | No paid runs permitted |
| [PVAL05](../../../changes/open/2026-11-18--pval05-scenario-proof-vs-fiction/CHANGE.md) | Benchmark-vs-acceptance clarity | Owner selection |
| [PVAL06](../../../changes/open/2026-11-18--pval06-product-claim-regression-guard/CHANGE.md) | Conditional automated claim-impact regression | **Blocked pending policy/schema and earlier edits** |

## Core source grounding

- `STATUS.md` explicitly says local pre-POC engineering portfolio, no sustained live 10–15-turn creative quality proof.
- `docs/product/foundations/vision.md:41–55` simultaneously declares small-party first-playable ambition and blocks its live acceptance; its simpler solo proof is far closer to an executable slice.
- `docs/product/gameplay/continuity.md:62–76` calls cubes a candidate and says authoritative spatial progress is undesigned.
- `docs/product/gameplay/rules.md:33–53` gives a narrow rules subset and fixture limits; full combat and advancement are absent.
- `packages/storyteller/README.md` distinguishes normal one-shot tasks from optional bounded memory exploration and warns against assuming live long-history reliability.
- `research/agent-practice/COGNEE-EVALUATION-2026-11-17.md` evaluates **developer-agent repository knowledge**, NOT game-world Storyteller recall.
- `docs/technical/storyteller/request-context-and-cost.md:169` records one pinned actual Sol provider attempt (6,626 input, 673 completion, $0.023294); this is not a long-play price or quality benchmark.

No blanket reclassification to "false" is justified. These are mostly **unearned commitments and untested interactions**, not fabricated code status. That is the actual correction target.
