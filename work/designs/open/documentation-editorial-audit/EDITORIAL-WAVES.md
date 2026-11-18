# Documentation editorial execution waves | semantic quality first

**Status:** Proposed, not selected. **No product permission or code Change is granted.** These are documentation-only editorial sessions consistent with the existing Change standard: do not create fake executable Changes unless a wave genuinely adds/changes scripts or tests. When WIKI09–11 exist, use them for impact checks; when they do not, perform manual impact review and never claim the checks ran. All work is against refreshed HEAD and an inspected clean/dirty source status.

## Guardrails before the first wave

- Cursor may be concurrently implementing code. **Do not race a canonical owner** whose implementation Change is actively editing it. Rebase/reinspect before committing; coordinate the file set.
- Preserve ratified product and technical decisions. For edits that potentially change rights, timing, cost, data retention, permissions, fairness, collaboration or persistent state, stop for owner ratification.
- Distinguish factual status repair from a product decision; source/tests may prove implementation but cannot ratify new player promises.
- Keep a single owner per claim. Move rather than copy large explanations. Repair every inbound link/anchor and affected README/graph route within the same batch.
- Use a no-op disposition where text is already good. The goal is not to touch a quota of files.
- Every batch ends with a **readable before/after claim inventory**, a source/proof review, an adversarial question and cross-link verification. No automatic green declaration of semantic truth.

## S0 | Accuracy and authority triage, before large rewrites

**Inspect together:** product/foundations/vision.md, product/gameplay/acceptance-scenarios.md, product/gameplay/time-and-autonomy.md, technical/engine/authority-and-transitions.md and chronology-and-activities.md. Inspect GM03/GM07/T1/T2/open Change receipts, actual source/test behavior, and current STATUS before editing factual claims.

**Decisions:**
1. Split the acceptance scenario's *illustrative shared/delegated goblin branch* from the *ratified first-playable acceptance* or explicitly mark ratification as unresolved. The user/owner decides whether solo only, small party, or timed delegation is required for the next named milestone. Editorial work cannot decide that by grammar.
2. Resolve the “prepared but not implemented” versus “implemented” deliberate-time/finite-action statements at **sub-capability granularity**, with source/test SHA. If both claims apply to different slices, say which.
3. Repair false first-playable implications across vision and scenarios while keeping long-term collaboration ambition readable.
4. Add point-of-claim links from product time rule to technical gate and from technical status to exact proof; do not turn technical state into the governing product promise.

**Acceptance:** three fresh questions yield consistent answers from both linked pages: “Does closing a tab advance fictional time?”, “Is a generic missed-window fallback accepted and implemented?”, “What part of deliberate time is implemented at HEAD?”. If the final answer is unknown, the pages explicitly say unknown and point to the unresolved owner; they do not contradict each other.

**Applied 2026-11-18.** Decision 2 was recorded at `15a997c7`: the chronology status names the source-observed gate, the offline tests that were read, and the missing gate unit test. Authority no longer calls that correction unimplemented. The product pace rule is unchanged. STATUS no longer says fictional time has no accepted execution.

Decision 1, using the judgment authorized on 2026-11-18: the next milestone is solo. A small shared party and a timed delegated choice stay later ambitions. Vision, acceptance scenarios, time's first-playable scope, worlds-and-characters, the time-and-autonomy vision reconciliation, and the lifecycle membership recommendation now say that. The goblin walkthrough remains. The friend invite and the missed-window fallback are labeled as stress branches at those sentences. An unanswered decision in the next proof stays open until the player returns. A later timed fallback may close one only when the player already authorized it. This does not retire the long-term shared-story ambition, and it does not accept GM07.

S1a, first diary pass: the vision's unattended-life paragraph now states the player promise and points at the parked queue as a proposal. The concepts conversation example no longer labels turns T1 through T4. The storage-name note stays a boundary, including the path that can publish a present passage and a later arrival from one result. The chapter rule no longer depends on recalling an earlier wording.

S1b, first vocabulary pass: an offer in actions and commitments is permission to choose. It does not advance fictional time. Hours-long absence applies to an accepted activity. DOC08 remains unselected and was not executed as a packet.

**Deliverable:** small reviewed canonical edits, optional split of scenarios only after link audit, exact before/after claim list and a recorded unresolved decision request. Not a new code Change.

## S1 | Product bible: promise, agency, long-life quality

**Primary owner set:** product/foundations/{vision,concepts}.md, product/gameplay/{rules,actions-and-commitments,time-and-autonomy,continuity,worlds-and-characters,acceptance-scenarios}.md, product/storyteller/{behavior-and-quality,memory-and-continuity,profiles-and-settings}.md.

**Suggested bounded editorial sessions:**
- **S1a Vision and vocabulary:** lasting promise, earned-life causal loop, character/world independence; eliminate implementation-diary clauses and make consent, rule and scenario owners visible where used.
- **S1b Mechanics and deliberate time:** align action/offer/attempt/commitment/clock vocabulary with governing product rules. Build one cross-domain scenario each for immediate action, extended work, idle/absence, interruption, and nonhuman character.
- **S1c Continuity and Storyteller:** source facts vs world proposals vs private direction, retrieval/provenance, remembered relationships, meaningful quiet and choice agency. Keep separate creative profile, narrative initiative, canon invention and spending permissions.
- **S1d Acceptance narrative:** six-step playthrough and earned-life/space/abstract benchmarks are both valuable, but should have distinct acceptance status, source links and test assumptions. Split if ownership and update cadence warrant it, preserving all examples.

**Acceptance:** a reviewer can describe why earned effort matters, what actions are authorized, what happens during absence, what facts survive, and when the model must stay silent, without jumping between contradictory pages. A different persona/setting must not inherit humanoid defaults or compulsory dramatic incidents.

## S2 | Engine and Storyteller contracts: clean causal spine

**Primary owners:** all technical/engine/** and technical/storyteller/** (see [page register](PAGE-REGISTER.md)); process in bounded ownership neighborhoods rather than one mega commit.

**Suggested sessions:**
- **S2a Engine authority/clock:** selected architecture, transitions, chronology, ticks, calendars, mechanics; claim-led causality with exact time/receipt/hold/frozen-authority negative traces.
- **S2b Lifecycle and recovery:** source/passage identity, idempotent commands, locks, CAS, retries and generation fences; exact failure/late/unknown effects. Isolate targeted future ENG03 promises from implemented paths.
- **S2c Storyteller task behavior:** controller selected two-loop target vs current prototype, allowed tool reads/writes, stopping and no duplicate model call, publication and evidence barriers.
- **S2d Canon/memory/context:** audit responsibility split between context-and-memory (~8.3k words) and request-context-and-cost (~6.9k). Preserve canonical document authority in one owner, request assembly/budget in another; move overloaded retrieval policy to a single technical owner or section, not two duplicated specs.
- **S2e Settings/provider:** captured settings, provider packet/dispatch/unknown usage, effective funding policy; keep selected vs supported proof precise.

**Acceptance:** one short path through exact headings answers: “An action settled, model output failed, retry arrived: what remains true, what can be sent, and what must not be rerolled or charged?” The path must specify owner, time/source identity and negative branch, not just “recover safely.” Large docs may stay large if the claim responsibilities genuinely belong together.

## S3 | Player UI product-to-technical expression

**Product owners:** product/experience/**; **technical:** technical/client/**. Group Living Book composition, source-fidelity, semantic tokens, scene direction, forms/caches, accessibility, error/uncertainty states.

**Acceptance:** same original published prose/options remain exact through visually different scenes; styling cannot recolor system danger/focus/reader ink or create a command. An uncertain click and a stale SSE notification do not fake a successful action. State what the POC has proved versus design-system/visual-calibration goals awaiting human acceptance. Move Wxx/BOOKxx progress descriptions to evidence maps when possible.

## S4 | Platform obligations and operations

**Owners:** technical/platform/**. Audit topology/proposed stack, persistence and DB transaction ownership, delivery, identity, spending, notifications and deployment. Do not rewrite measured source behavior into future aspiration or vice versa. The destination for a current **how-to** is runbooks, not a selected architecture contract.

**Acceptance:** identity and funding cannot be overridden by a Storyteller creative setting; an unknown charged provider dispatch cannot be blindly replayed; a database commit remains truth even if a Temporal signal is duplicated or lost. Proposed cloud/observability components are not claimed deployed.

## S5 | Admin, forensics and privacy: explicit ratification walls

**Owners:** product/admin/**, technical/admin/**, technical/observability/**. Start each session with a **selected/proposed/candidate/implemented matrix by heading**. Keep current staff grants and actual source-observable reads separate from proposed package catalogs, raw-AI disclosure, Turn Capsule and retention windows. Do not use source code to approve a legal/privacy policy.

**Suggested sessions:** S5a product jobs and privacy promise; S5b technical authorization and staff reads; S5c evidence model vs proposed capture/replay/retention/telemetry. Technical selected evidence graph is not blanket ratification of proposed forensic read/retention modules.

**Acceptance:** given two users, one shared story and a redacted prompt, a staff operator cannot accidentally gain access from the *presence of a document*. Retention candidate values remain explicit nonbinding proposals, pending owner/legal cost review.

## S6 | Lab, evidence and whole-corpus editorial close

**Owners:** technical/lab/**, touched hub paths, docs/README, root README where product promise changed, and source map references when editorial moves impact them.

**Cross-corpus exercise:** 12–20 held-out questions from [editorial standard](EDITORIAL-STANDARD.md#editorial-completeness-evaluation-separate-from-graph-health) across selected and proposed behaviors; compare answers from old/new revisions, and manually challenge contradictions and omissions.

**Metrics to report (separately, with held-out answer keys):**
- incorrect claim authority (selected vs proposal vs implemented) on high-risk tasks;
- missed essential invariant or negative case;
- conflicts across two canonical pages in the same dependency neighborhood;
- unsupported confidence from unproven code/evidence;
- exact heading discovery and bounded document reads;
- unrelated-document review burden, especially after adding impact links.

Set quantitative thresholds only after measuring the baseline on the exact frozen task set. Do not invent “95% semantic accuracy” or a one-number wiki grade.

## Per-session handoff template (documentation-only)

~~~text
Editorial wave: Sx; current source SHA and dirty status:
Owner headings under review:
Known selected product truth (must not change):
Selected technical target (if relevant):
Current implemented/proved boundary, evidence path:
Proposal/illustration boundary:
Before defects with exact source excerpts:
Expected edit: rewrite | split/relocate | factual status fix | no-op:
Proposed new canonical owner/heading and inbound link repair:
Dependent sections to reread independently:
One normal, one discriminating negative scenario:
Ratification needed? exact question and blocked paragraphs:
Validation performed (links/graph/heading references, independent semantic check):
Actual files/links changed; unresolved review debt:
~~~

**Important:** never mark a wave “Done” because all planned files were touched. It is Done only when the intended semantic quality difference is evidenced and the authority/impact review is complete. An approved no-edit page is a legitimate result.
