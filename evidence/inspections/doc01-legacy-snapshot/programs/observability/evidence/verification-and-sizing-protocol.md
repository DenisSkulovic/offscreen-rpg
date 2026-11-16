# Forensic observability | Verification, sizing and human usefulness protocol

**Status: prospective proof design, 2026-11-15. No tests, model calls, migrations or load experiments executed.** Sources: [mutation map](mutation-writer-audit-2026-11-15.md), [capture atomicity](../technical/capture-transaction-protocol.md), [historical reconstruction](../technical/reconstruction-algorithm-v1.md), [prompt provenance seams](../technical/storyteller-prompt-source-map-v1.md), [Admin read security](../technical/forensic-access-and-read-contract-v1.md). This protocol must be converted into scoped test implementation only after owner authorizes one actual Change.

## 1. Define the adversarial golden story once

Build one deterministic, provider-disabled fixture with meaningful source identities, not a synthetic “hello world” graph:

~~~text
A. Draft profile P@rev1, approved Start with source manifest H1.
B. Story genesis checkpoint and published scene #1.
C. Player changes creative settings from R1 to R2; preserve old and new.
D. Select an offered finite action; accept operation O; fictional time advances.
E. An activity completes multiple check boundaries in one SQL transaction.
F. A required item holder changes; another accepted transfer interrupts,
   without a success receipt, with a controlling Storyteller consequence.
G. Frozen Storyteller G compiles context from H1 and older passages.
H. At least one optional source is eligible/loaded then pruned; at least
   one mandatory source is included in the exact final packet.
I. A capture is delayed by 2s CAS; another legitimate same-story writer
   tries to acquire the story lock during materialization.
J. Model execution: scripted/no provider, plus a separately simulated
   uncertain provider attempt with **no network or actual spend**.
K. G output succeeds, but one alternate test moves scene/root and
   proves publication becomes stale/blocked instead of rewriting it.
L. A historical report about an older activity publishes after a newer
   controlling scene, with different sourceGameSecond and commit frontier.
M. One Admin Support case is linked to the story and a limited grant.
N. Developer tries metadata/source graph, then exceptional raw body read;
   revoke grant mid-session and verify denial.
O. A protected body is expired/deleted in test, published story remains
   intact if its separate retention policy permits it.
P. Player reads old 20 published scenes via replay with no mutation.
~~~

Extend this into three world-neutral fixture families: **ordinary humanoid repair**, **nonhuman microbe/sensing**, and **long quiet time**. A state schema that assumes every character owns currency, human inventory, position or named NPC is unacceptable. Reuse existing Chamber/QAs rather than authoring a second fake mechanics engine.

**Expected result:** one complete indexed graph from accepted cause to committed outcome and source/AI history, without new spell-of-HTML-adapter authority. At each step verify the current source of truth, IDs, hashes, event count, and exact completeness markers.

## 2. Proof ladder (do not blur evidence classes)

| Level | Scope | What it can claim | What it cannot claim |
| --- | --- | --- | --- |
| **L0** | Architecture/Markdown source audit | Intended contract, inspected entry points and known risk | Runtime capture, performance or correct human UX |
| **L1** | Pure strict schemas/codec round-trip tests | Typed serialization, hashing, same-shape decode, explicit omissions | SQL transactional consistency |
| **L2** | Disposable SQL + CAS fault harness | E0 co-commit, ordering, idempotency, object lifecycle, operator/audit limits | Long-lived production availability or real provider billing |
| **L3** | Worker/Temporal + API + local browser | Durable wakes/retry graph, authorization, state reconstruction, Admin/Replay UX | Production-scale capacity or every private provider API |
| **L4** | Controlled deployed staging, bounded synthetic load | Measured ingestion/retention/latency/backpressure in known topology | Universal scalability or privacy legal compliance |
| **L5** | Small approved real campaign/Support human task evaluation | Real-world ease of diagnosing/replaying captured incidents | General proof all model outputs/reasoning are understandable |

**Provider paywall:** L0–L3 are provider-disabled. Paid model evaluation requires explicit separate owner spend cap and account/usage approval; do not claim external provider correctness from a scripted fixture.

## 3. Exact accepted-source invariants

For every meaningful writer on the [mutation audit](mutation-writer-audit-2026-11-15.md):
1. One authorized new command or worker settlement changes authoritative state exactly once.
2. One new forensic transition group is committed with the business mutation and the correct source identity. One rollback yields zero committed source/evidence.
3. Duplicate operation with identical input returns original source/receipt and does **not** increment forensic story sequence.
4. A conflicting reused operation ID never overwrites existing event content or creates a second source G.
5. Within one activity transaction with multiple rolls/checks, recorded subevent ordering reflects the actual rule order, but the group is labelled **one atomic commit**.
6. Changes to `campaign.character/storyFacts/holds/clock/clockAnchorAt/worldConditions`, item holders, accepted plans, settings and root are represented by exact typed before/after data or an explicit not-yet-covered gap.
7. Source root and setting ID at each context/task point are frozen. Old history cannot silently read today's `story.documentRootHash` or settings version.
8. Outbox/Temporal and provider stages attach to the same operation/G instead of manufacturing extra game time or duplicate paid calls.
9. Historic replay GET has zero side effects; check row counts before and after (no outbox notice, generation, attempt, game time, roll, reward or receipt).
10. Engine permits no unbounded inline debug blobs in hot SQL that degrade lock latency.

**Source diff receipt:** every test records source commit, schema/migration versions, scenario ID, initial exact state hash, operation IDs, expected/actual sequence, test environment, run commands and failure mode.

## 4. Source provenance proof cases

| Case | Test observation needed |
| --- | --- |
| Profile has same display name but different Git/content hash | Prompt inspector separates actual old vs new component |
| Campaign creative settings changed after G admitted | Old G shows captured R; later dispatch authority may only tighten |
| Mandatory root source missing in CAS | Capture held/blocked, no invented narrative and no implicit fallback to latest source |
| Optional source selected then loaded then pruned | Exactly those stage statuses recorded; final packet excludes its text |
| Two candidate documents with identical excerpt text | JSON pointer/source IDs disambiguate; no substring-based source map |
| Optional `memory-exploration` recipe not selected | UI explicitly displays “not run”; never invents a model loop |
| One round with tool read, second final model round | Each exact request and result, approved source handles, costs and validation linked by G |
| Provider packet inspection differs from actual HTTP serialized bytes | No paid send under custody contract, explicit mismatch incident |
| Provider timeout after dispatch | Preserve possible billing/uncertainty, no automatic duplicate |
| Generated scene valid but publication stale | Candidate stored; no new authoritative scene or fake success |
| Raw packet retention ends | Source hash and explanation survive only where allowed; private body unavailable at **every** source location, including old SQL JSONB |

**Negative security:** malicious prompt text containing nested fake instructions or HTML is treated as player-authored data, never as an Admin instruction/code or model-side authority outside the captured game task.

## 5. Crash-injection suite

Fault each point independently, not one enormous unreliable integration:
- after acceptance validation before story transaction;
- after first authoritative UPDATE but before evidence INSERT;
- after evidence INSERT before commit;
- after commit before API/Temporal ACK;
- during CAS stage/hash verification;
- after protected artifact write but before SQL pointer promote;
- just before E1 provider packet send;
- just after marking `dispatched` before socket write;
- after provider response before accounting settlement;
- after output validation before publication;
- during Admin raw read before audit-intent commit;
- after audit commit but before body read;
- after expired body purge while an old browser tab remains open;
- during checkpoint reconstruction at a missing/corrupt transition.

A test passes only when **the business result is correct, evidence coverage truthful and the retry/recovery does not create new effects/spend**. An application returning HTTP 500 or worker failing doesn't itself establish correctness.

## 6. Measurements required to make retention economical

Do not set production size/retention quotas based on imaginary typical prompt lengths. Use at least 3 scale bands:
- **Tiny:** 10 meaningful transitions, 2 Storyteller tasks.
- **Medium:** 100–200 meaningful transitions, mixed work/report/scene, varied contexts.
- **Long:** 2,000 scene/event-capable synthetic history, sparse relevant recall.

Measure separate current/added costs:

| Dimension | Required recorded metric | Design significance |
| --- | --- | --- |
| E0 SQL row growth | total bytes per story/transition, index bytes, WAL amplification | Hot DB cost, backup/replication |
| E1 raw packet custody | exact request/output bytes before compression, after compression/encryption, source dedup ratio | Retention cost vs debugging value |
| E2 provenance | candidate count, decision records, source edges, bytes, p50/p95 per turn | Avoid metadata explosion |
| Read workload | DB queries, CAS reads, returned bytes per Support summary / engineer G view / replay seek | Human-facing performance |
| Game write critical path | story lock wait and held duration (with 0/250/2000ms CAS delay), transaction p50/p95 | Ensure observability doesn't reintroduce ENG03 lock issue |
| Storyteller pipeline | time to frozen task, model-ready packet, validation, publication | Identify real vs synthetic delays |
| Long game replay | checkpoint count, max deltas scanned, p50/p95 seek time and integrity failures | Choose checkpoint interval |
| Privacy lifecycle | expired raw bytes still stored by owner, unreferenced artifacts, derived cache/backups, GC lag | Truth of retention promise |
| Admin governance | protected read approvals, denies, audit failures, response sizes, privilege epoch invalidation | Ensure “developer convenience” doesn't become data exposure |
| Collector | spans emitted/accepted/dropped, queue/disk size, cardinality by label | Operational telemetry costs and gaps |

**Cost estimate:** calculate total monthly incremental GiB for SQL rows/indexes/WAL/backups plus protected CAS bytes×retention class and expected read/API requests; explicitly include per-tenant limits, legal holds and failure amplification. If expected raw packet storage dwarfs replay business data, tighten raw retention or allow explicit opt-in diagnostics rather than disabling durable receipts.

## 7. Initial quality targets (aspirational, require measurement)

- **Source coverage:** every *newly instrumented* accepted/settled meaningful transition has exactly one valid committed E0 group. Pre-instrumentation history is explicitly `not-recorded`.
- **Dispatched model custody:** every newly performed paid attempt has durable verified packet identity before possible send, with truthful uncertain status where transport/charge is unknown.
- **No lock amplification:** injected CAS wait should not extend story row lock beyond the legitimate SQL/fence work for the instrumented path.
- **Bounded hot cost:** aim for small incremental SQL writes and no remote artifact I/O inside story-lock transaction. The acceptable p95 degradation ceiling must be selected from a **measured baseline** before rollout, not imposed here as a fake 10% target.
- **Privacy:** no raw player/protected model text in Prometheus labels, ordinary OTel spans, plain process logs or public Admin DTO. A policy-ineligible raw read is denied even if artifact bytes remain physically present.
- **Human usability:** Support can answer a stuck-action, unpaid-reward and stale-publication case from the safe panel without reading JSON; Developer can locate an exact prompt component and source omission cause via synchronized workbench within a bounded flow.
- **Player replay:** recorded scene playback does not invoke one new command, RNG, clock update or provider call. Missing old mechanic state is explicit.

## 8. Human evaluation tasks

**Support volunteer without code access:** given a named case and legitimate grant, find accepted action/last result/current hold, explain whether anything was earned and escalate an unresolved narration in a short guided session. Track time to valid answer and wrong assumptions, not just click count.

**Developer volunteer:** given a historical “Storyteller ignored memory” case, compare two generations, determine whether memory was never a candidate, selected-but-not-loaded, loaded-but-pruned, finally included or model-visible-but-not-used. They must correctly distinguish verified facts from speculation and locate exact prompt/profile/setting revision without opening a shell.

**Player:** replay a prior interruption and a later report, know which scene was originally visible and which choice was theirs, and understand that clicking replay does **not** create a new branch or change the live story.

Reject a UI that passes TypeScript but still requires the engineer to manually join a dozen raw SQL tables to understand one turn. Equally reject a pretty UI that invents missing causal links.

## 9. Exit receipt for the first three evidence Changes

Every completed implementation packet should attach:
- code and migration diff with SHA;
- exact test commands/results and environment;
- one representative redacted source-linked event/capture manifest;
- normal and negative case with old/new IDs;
- measured lock/latency/bytes and no paid-call evidence;
- source-derived coverage and preserved legacy decoders;
- remaining unresolved risks and next Change dependency.

**No changes are active**. This protocol exists so a later implementation result can be judged against falsifiable guarantees instead of “observability looks comprehensive”.
