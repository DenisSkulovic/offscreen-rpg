# Product documentation audit | section-level risk and every-page disposition

**Basis:** clean source snapshot `ec8c652c5b0a` on 2026-11-18. Inspected all `docs/product/**/*.md` (31 files) plus `STATUS.md`, `ROADMAP.md`, `docs/README.md`, Storyteller technical/context documents, current package/source routes, the Cognee experiment record and the existing gameplay-domain coverage catalogue. Source-code symbols were inspected textually, NOT compiled or executed here. Because the lean snapshot omits historic evidence/archives, source-reported historical tests are not independent reruns.

## Summary judgment

1. **Document navigation and claim-authority routing:** substantially improved. The snapshot's `WIKI-INDEX.json` reports 91/91 canonical pages reachable, 0 broken internal links among 3,147 inspected. This proves link integrity, **not truth**.
2. **Implementation honesty:** partly good. Many sections correctly distinguish selected, source, tested, live and absent; the `STATUS.md` table names substantial gaps. This is not an entirely fictional README farm.
3. **Feasibility honesty:** inadequate. Many selected obligations are undemonstrated at the integrated-game level, and the editor lacks a mandatory "what evidence would falsify this" and "per playable turn cost" discipline.
4. **Product coherence:** unproved. Broad world neutrality, D&D fifth-edition-derived rules, bounded typed effects, unlimited-looking creativity, dormant local activity, open-ended time and future multi-player concurrency compete for the same narrow context/authority budget.
5. **Quality evidence:** disproportionately small relative to system ambition. September six connected Sol generations and strong offline/component tests do not equal sustained, enjoyable, multi-day play.
6. **Economics:** not hopeless by arithmetic, but not proven. At least one real call was $0.023294; costs expand with repeated prompts, inference rounds, retries, discarded branches, recaps, retrieval and labor-intensive prompts. Commercial feasibility cannot be inferred from a single low-cost sample.

## Page-by-page disposition

Labels: **Keep** = credible boundary with a limited claim; **Split** = separate commitment from ambitious extensions; **Recast** = change authority/wording and move uncertain claims to hypothesis; **Guard** = preserve but attach a measurable validation/economic gate. These are editorial recommendations, NOT a claim that the page is wrong on every line.

| Product page | Main assessment | Action |
| --- | --- | --- |
| `README.md` | Says product is what players/staff "must be able to rely on"; does not distinguish confidence in viability from normative design. Strong question routing exists. | **Split:** add credibility/maturity front door and explicit POC vs horizon |
| `foundations/vision.md` | Strong earned-time/authority core; deep feature bouquet, small group in first playable despite blocked protocol, a hundred-player horizon. | **Split (urgent):** product thesis, solo proof, longer-term bets; make first playable meaning unambiguous |
| `foundations/concepts.md` | Turn/scene/execution vocabulary carefully defined, explicitly no chapter system. Mostly coherent and useful. | **Keep:** add "observed vs conceptual" only where claims imply runtime implementation |
| `gameplay/rules.md` | Implementable d20 subset; universal/world-neutral fifth-edition positioning creates scope tension with abstract forms. Full combat not claimed. | **Guard:** require one supported nonhuman counterexample plus live-mechanical interpretation; no universal-rule expansion |
| `gameplay/actions-and-commitments.md` | Excellent deterministic-causality spine and prepared opportunities; engine expressly cannot derive new options. That choice constrains player agency and may create inference demand. | **Guard:** prove authored-option supply/quality/cost under real play, not just settlement tests |
| `gameplay/time-and-autonomy.md` | Distinguishes elapsed real/fiction time; proposed routine queue, events, clocks, notifications and multiplayer create much larger behavioral scope. | **Split:** select tiny solo time policy and park any general autonomous life scheduler |
| `gameplay/continuity.md` | Progressive identity materialization is promising; scene frame, significant people, provenance, spatial semantics, object tracking and recall are a compound program, not one feature. | **Split (urgent):** minimum state, canonical evidence, supported entity edits, spatial hypothesis |
| `gameplay/worlds-and-characters.md` | "Fantasy, space, everyday life, unusual creatures" advertised as core flexibility before cross-world fit is shown. Has explicit limits and no compulsory humanoid fields. | **Recast:** world-neutral architectural constraint, not POC promise of equivalent arbitrary-world gameplay |
| `gameplay/acceptance-scenarios.md` | Goblin/apple and companion scenarios illustrate behavior, but first-playable ambition leaks unresolved shared policy into reader expectation. | **Recast:** label fixture versus solo acceptance versus later stress tests with mechanical prerequisites |
| `gameplay/long-life-benchmark-playthroughs.md` | Useful adversarial north-star scenarios; Vvardenfell/space/microbe/Patrol narratives need many independent unbuilt capabilities. | **Recast:** research test atlas; each benchmark needs feasibility/cost gates and no implied release target |
| `storyteller/behavior-and-quality.md` | Sound prohibitions and neutral-style principle; enduring private narrative intent and months-long life are visions, not proven creativity. | **Split:** invariant safety vs human-rated creative-quality hypotheses |
| `storyteller/memory-and-continuity.md` | Source-linked recall design wisely distinguishes history from evidence. It is more an acceptance target than measured long-life capability. | **Guard:** exact return benchmark, retrieval precision, abstention, provider rounds and real cost |
| `storyteller/profiles-and-settings.md` | Actual editor/source limits documented; future five-domain canon invention matrix, narrative initiative, tags and locked policy compound complexity. | **Split:** current profile controls from future policy engine; prove a visible creative difference |
| `experience/principles.md` | Good honesty and readability guardrails; mostly independent of AI breakthroughs. | **Keep** |
| `experience/entry-and-onboarding.md` | Creation/start constraints credible but large flexible premise and collaborative invitation should not imply currently ready play. | **Guard:** no unexecutable option at creation |
| `experience/living-book-poc.md` | Narrow, recently owner-selected UX direction, explicitly separates target from source and final skin. | **Keep:** verify accessibility and comprehension through actual player walkthroughs |
| `experience/navigation-and-stories.md` | Product IA; relatively low feasibility risk; subject to UI evidence. | **Keep** |
| `experience/play-and-decisions.md` | Choice truth/held/wait states are concrete and essential; quality of meaningful choices unproved. | **Guard:** player can identify actual risk, control and state after every operation |
| `experience/presentation.md` | Presentation promises likely attainable with limitations; Storyteller-directed visuals add cost/schema risk. | **Split:** POC static/stable reader vs model-authored scene direction |
| `experience/return-and-journal.md` | Saved originals and recap useful; long-life recap quality unproved. | **Guard:** distinguish history display from AI-generated faithful recap |
| `experience/settings-and-accessibility.md` | Mostly standard product obligations. | **Keep** |
| `experience/design-system-and-expression.md` | Selected design-system architecture, not implemented. Fine as a design target; no automatic generative art obligation. | **Keep:** retain conditional gates for Storyteller-authored art direction |
| `admin/README.md` | Correctly marks staff operating policy proposals; not live powers. | **Keep:** route all staff fiction to long-horizon program, do not count as first-playable core |
| `admin/charter-and-personas.md` | Accepted long-term *direction* but large company/staff roles before gameplay product market proof. | **Recast:** long-term operating hypothesis; safety principles retained |
| `admin/authority-and-governance.md` | Least privilege and audit concepts sound, actual grant catalog proposed. | **Keep:** no implied production authorization |
| `admin/player-360-and-support.md` | Business-scale workflows depend on users, subscriptions, privacy decisions and multi-actor games that do not exist at product scale. | **Recast:** conditional future operations, not MVP backlog |
| `admin/commercial-and-trust.md` | Important distinct finance/privacy constraints, but refund/billing policies not ratified. | **Keep** safety, **park** workflow breadth |
| `admin/gameplay-and-liveops.md` | Complex multi-world versioning/live-ops speculative absent scaled live gameplay. | **Recast:** later, except immediate incident/budget kill switch |
| `admin/ai-engineering-and-investigation.md` | Valuable for POC diagnosis; large operator workflow assumes rich evidence/reporting. | **Keep** minimal forensic proof, park expanded console |
| `admin/command-center-and-insights.md` | Aspirational operations / analytics surface, not first product validation. | **Recast** into future operational goals |
| `admin/operator-workflows.md` | Conditional staff journeys; safety admirable but not current game evidence. | **Recast** into future operator scenarios |

## High-risk wording patterns

- **Vision > acceptance inversion:** `foundations/vision.md:41–55` calls small cooperative party "first playable" while its live consent acceptance is still blocked. The smaller solo proof appears on the same page. Solution: name the *next actual player proof* as solo, move co-op to a dated future hypothesis.
- **Capability versus universal experience:** `gameplay/worlds-and-characters.md:8–10` + `gameplay/rules.md:29–35` demand broad world/form neutrality and concrete D&D attributes simultaneously. This may be architecturally adaptable, but it is not evidence of interesting gameplay in all forms.
- **Spatial conclusion without representation:** `gameplay/continuity.md:62–76` insists on authoritative position/progress; topology/map and interrupt representation remain open. Must not accept map-UI design as mechanics proof.
- **Autonomy without authoring:** `gameplay/actions-and-commitments.md:27–39` explicitly forbids engine-generated choices. Viable for bounded activity menus, but at scale re-invoking the model for novel choices may dominate cost and latency. Test it rather than assuming it is free.
- **Storage ≠ memory:** `gameplay/continuity.md:110–116` and `technical/storyteller/context-selection-and-recall.md` prescribe canonical files and retrieval; exact source presence does not prove the DM will recall the right fact at the right moment.
- **Typed validity ≠ creative coherence:** `research/authored-scenarios/storyteller.md` says validator can reject unsupported outcomes but cannot assess whether options are interesting. This is a core release-quality risk, not a minor prompt-tuning item.
- **Quality promise without priced proof:** `storyteller/behavior-and-quality.md:62–82` describes narrative initiative and months-long lives, but reports 10–15-turn live creativity still unproved.
- **Demo versus real-time life:** `foundations/vision.md:49–55` asks for an immediate demo while the signature mechanic is waiting real hours. A demo should fast-forward in a clearly labeled *demo mode*, not silently violate the actual game law.

## What we should NOT accidentally "fix"

- Do not turn all technical truths into proposals just because the long-term vision is unproven. Idempotent settlement, frozen receipts, no model dice, honest status and explicit spending caps are non-negotiable engineering safety constraints.
- Do not delete explanatory benchmarks; their value is to uncover future contradictions. Move/label them and give them owners and exit criteria.
- Do not make the game an always-on agent swarm to compensate for model unreliability. For the first product, deterministic routines and conditional generation are the *economically viable feature*, not a consolation prize.
- Do not add a giant product-status bureaucracy with one required row per sentence. Pilot a small register of **high-impact cross-feature claims**, with exact headings and evidence, and expand only where useful.
