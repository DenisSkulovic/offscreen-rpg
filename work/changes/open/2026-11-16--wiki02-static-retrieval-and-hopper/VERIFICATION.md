# WIKI02 | Seeded questions and falsifiable static benchmark

**Not yet executed.** These 30 initial questions are an owner-review **candidate corpus**, not certified gold truth or measured retrieval success. Implementer must inspect the exact owner headings at the frozen benchmark SHA before populating the approved gold file. Record approved/disputed/not-applicable per case. For source/coverage cases, check matching code/evidence tier rather than blindly trusting a DOC04 status sentence.

## Initial cases

| ID | Natural user question | Candidate primary authority |
| --- | --- | --- |
| P01 | What makes this a living RPG rather than a chat conversation? | `docs/product/foundations/vision.md` |
| P02 | Does fictional time advance if I have not accepted any action? | `docs/product/gameplay/time-and-autonomy.md` |
| P03 | What qualifies as an accepted commitment rather than a narrated intention? | `docs/product/gameplay/actions-and-commitments.md` |
| P04 | Who decides whether I earned an item or the dice result? | `docs/product/gameplay/rules.md` |
| P05 | Can a character be nonhuman without a standard humanoid inventory? | `docs/product/gameplay/worlds-and-characters.md` |
| P06 | What should a player see in the journal after returning? | `docs/product/experience/return-and-journal.md` |
| P07 | What may the Storyteller invent, and what must it refuse to invent? | `docs/product/storyteller/behavior-and-quality.md` |
| T01 | What is the intended engine architecture, and who owns mechanical truth? | `docs/technical/engine/selected-architecture.md` |
| T02 | How should a stalled external context read avoid holding a story lock? | `docs/technical/engine/concurrency-and-recovery.md` |
| T03 | How do provider reservations and paid attempt settlement work? | `docs/technical/storyteller/provider-boundary.md` |
| T04 | When may the Storyteller inspect memory and when must its loop stop? | `docs/technical/storyteller/prompts-and-tools.md` |
| T05 | Which data is narrative evidence versus committed mechanical state? | `docs/technical/storyteller/context-and-memory.md` |
| T06 | What happens when a stored document is missing during S3 cutover? | `docs/technical/platform/data-and-persistence.md` |
| T07 | What belongs to Next server render versus client/query state? | `docs/technical/client/state-and-server-boundary.md` |
| S01 | Is authenticated SSE invalidation actually implemented? | `STATUS.md` plus `docs/technical/client/architecture.md` |
| S02 | Does the Chamber have a connected lane today, and is paid-provider proof done? | `STATUS.md` plus `docs/technical/lab/chamber-and-fixtures.md` |
| S03 | Do ENG03-C1/C2 mean the full lock refactor is complete? | `STATUS.md` and `docs/technical/engine/concurrency-and-recovery.md` |
| S04 | Is the adaptive Storyteller investigation loop live by default? | `STATUS.md` and `docs/technical/storyteller/operation-and-controller.md` |
| S05 | Does production Support currently have a raw-prompt access grant? | `STATUS.md` and `docs/product/admin/authority-and-governance.md` |
| S06 | Can current forensic evidence reconstruct every past turn causally? | `STATUS.md` and `docs/technical/observability/investigation-and-reconstruction.md` |
| D01 | Can the character pursue an unattended standing routine? | `work/designs/open/time-and-autonomy/README.md` plus accepted time rule |
| D02 | Can a missed decision get a preapproved default? | `work/designs/open/time-and-autonomy/README.md` and GM07 Change, not accepted by default |
| D03 | Who decides the pause policy in a shared story? | `work/designs/open/shared-play/README.md` |
| D04 | Is player-facing replay the same as the Support forensic reconstruction? | `work/designs/open/player-replay/README.md` and canonical observability |
| A01 | A legacy technical page says SSE is not implemented. Should I trust that? | Canonical client + current source/STATUS |
| A02 | A design says unanswered choices automatically move time. Is that approved today? | Accepted time rule versus GM07 proposal |
| A03 | OBS07 has a synthetic Support screenshot. Does this grant production prompt access? | Admin product authority + STATUS |
| A04 | An old ENG05 design says no code authorized. Is the S3 adapter absent? | Canonical document-store target and current source/STATUS |
| A05 | A historical experience essay calls itself the replacement specification. Is it binding? | Current product experience canon, not retired Git source |
| A06 | An archived Change says Done. Can I run that packet again without new approval? | `work/changes/README.md` and root `AGENTS.md` |

## Gold record requirements

Each case is versioned and has actual SHA, source-of-truth heading(s), relevance grade 0–3, primary-vs-companion status, selected/proposed/observed evidence tier and exact critical errors to reject. Avoid a simplistic answer-key keyword that says “yes” when actual answer is “selected but source-only.”

For W0, a route is scored against **existing headings**. For W1 lexical search, a result in a historical/parked corpus cannot substitute for accepted owner. For open-design questions, the accepted boundary and open gate both matter; report them separately.

**Agent isolation requirement:** these questions and gold hints are in the repository proposal. A future WIKI03 runner must build an agent-visible repository snapshot that excludes benchmark instructions, gold datasets, WIKI01–03 Change packets and any reference key. The runner must verify the exclusion with a secret canary file before launching any real model.

## Static mutation and correctness gates

- Swap one visible link label for `here`: Hopper relevance should worsen in a controlled fixture.
- Disconnect a mandatory canonical owner: W0 route must fail and WIKI01 integrity status must remain failed even if lexical search still finds text.
- Poison the search index by removing a relevant page: W1 Recall@5 and/or MRR must degrade.
- Insert archived/parked bait as a candidate normative page: wrong-authority score must detect it; never reward historical search hits.
- Use query text with no lexical overlap but a reachable target: W0 succeeds, W1 may fail; do not conflate.
- Fix the RNG and rerun 100 seed simulations: Hopper results must reproduce exactly, including failures.
- Include two correct owners for one question with 1 mandatory and 1 supporting source: missing mandatory owner cannot score full success.
- A wrong gold page or nonexistent heading makes the *dataset validation* fail, not the wiki itself.

## Required command receipt

```bash
git rev-parse HEAD
pnpm wiki:health
pnpm wiki:bench:static --self-test
pnpm wiki:bench:static --seed 20261116 --json
pnpm wiki:bench:static --seed 20261116 --json
git diff --check
```

Print the actual questions approved/rejected, case count, first/second identical semantic report hashes, misses, median/p95 gold route, Hopper hit@3 and hit@6, MRR and Recall@5 and counts/denominators. Show at least one real failure on baseline; if there are none, demonstrate failure on a deliberate fixture mutation. Record zero model/provider calls. No “95% retrieval quality” from a path map alone.