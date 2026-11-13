# Engine architecture verification | discriminate real correctness from impressive scaffolding

**Status:** proposed test/evidence program, **nothing run as part of this architecture pass**. Sources: [testing knowledge](../../../.agents/knowledge/testing-and-quality-evidence.md), [the Chamber program](../../engineering/chamber-program.md), [product scenarios](../product-derived-requirements.md), [source audit](source-audit.md). This is designed to be used with **explicit permission for side-effectful database/provider tests**.

## A test is only as valuable as the claim its boundary proves

The product dream requires three orthogonal kinds of truth:
1. **Game truth:** consistent time, dice, resources, identity and permissions under all execution/replay conditions.
2. **Story truth:** content sources, character memory and creative consequences remain coherent and source-grounded, including surprises.
3. **Operational truth:** concurrent players/stories and deployments keep working at measured latency/cost/capacity with graceful failure.

A hundred tests calling the same pure fake engine do not prove Postgres locks. Two impressive load charts don't prove that a familiar NPC remembered a promise. One delightful Storyteller passage doesn't prove replay safety.

## Evidence ladder with explicitly limited claims

| Level | Environment | Proves | Does not prove |
| --- | --- | --- | --- |
| **L0 design** | Markdown + source review | Desired behavior, known gaps, alternatives | Implemented functionality |
| **L1 pure rules** | Versioned seeded policies | Check math, capability eligibility, deterministic transition | SQL transaction/retry; provider quality |
| **L2 isolated DB** | **Disposable** PG + application | One authenticated admission and atomic effects/receipts, resource conflicts | Worker and provider availability |
| **L3 worker/transport** | PG + Temporal/outbox fake providers | Durable wait, cross-process recovery and duplicate delivery | Arbitrary model storytelling |
| **L4 browser** | Next/Nest/DB with grounded fixture | Public projection, actor permissions, real UI truth | All stored model knowledge or months-long reliability |
| **L5 bounded real LLM** | Explicitly approved provider/usage | Actual model behavior, prompt quality/cost on sampled corpus | General creativity, all worlds or financial scaling |
| **L6 load/release** | Multiple replicas, synthetic workload and fault control | Measured capacity, compatibility, data recovery | Story fun |
| **L7 human play** | Real players, sessions and returns | Comprehension, curiosity, continuity/agency perception | Exactly-once SQL mechanics |

A Change defines **which** levels it must pass. Tests may be fast and cheap; claims must not exceed observed evidence. Don't automatically require L5/L6 after a simple pure-rule addition.

## Chamber: use it accurately

The developer Chamber can construct semantic specimens, drive real policy in Bench, stage held Storyteller packets and capture some application/connected evidence. Its **implementation packets CH01–CH16 are recorded Done**, but many scenario/lane availability flags are planned/blocked, and live DB provisioning, connected worker boot and model dispatch may remain separately gated.

For new engine work use a **scenario coverage map** with:
- `scenarioId@version`, actual registered lane (Bench/Sandbox/Connected/packet/live);
- source policy symbol and immutable fixture/seed;
- explicit expected state/effect and negative counterexample;
- actual executable command and evidence capsule if run;
- whether authoritative DB, Temporal, provider and browser truly participated.

A catalogue entry is not an executed test; a blocked lane is not green. Create one new **valid** fixture only when a product-level Change requires it, not to inflate coverage numbers.

## Canonical adversarial test catalog

### P1. A quiet life for 12 real months

Simulate **accelerated test-clock boundaries** while retaining exact accepted work semantics; never confuse test fixture acceleration with production time cheats. Include one-time tasks, bounded repeatable tasks, pauses, paid model requests and no-event intervals. Verify bounded workflow-history size, current state, correct chronological receipts and no invalid repeated reward.

### P2. Lost ACK and duplicate delivery

Submit one operation; crash after SQL commit but before HTTP response; retry exact body and change-body under same ID. Expect same receipt for exact retry, reject conflict for changed body, no extra roll/time/charge. Repeat with duplicate outbox notice and Temporal Activity execution.

### P3. Simultaneous item claim

Two actors or test commands try to move one unique item under the chosen current authority. A valid lock/concurrency model yields one successful transfer and one explicit conflict. The losing user never sees fictional ownership via optimistic UI; no duplicate item rows.

### P4. Clock boundary vs pause/event

A check and controlling encounter share one due game-second. Test permutations of pause/interrupt/check processing, worker restart, repeated wake, changing pace. Deterministic ordering, one event, earned progress preserved and no post-hold catch-up.

### P5. A nonhuman actor through two different rulesets

Microbe with sensing and nutrient cycle; bodiless intelligence with no HP/inventory or human geography. The public UI and engine must not create fake defaults. A form-change attempt must revalidate applicable capabilities and preserve old effects. Initially this is a **target** fixture until engine supports optional state.

### P6. Storyteller contradicts mechanics

Fixed failed roll and no reward; provider returns beautifully written success that gives a weapon. Admission/publication must reject or hold unsupported contradiction. A malformed candidate cannot escape via fallback JSON parsing.

### P7. An exact memory needle

A character promises to return a compass in passage 30, changes holder at passage 50, goes quiet for 250 passages and meets the same person at 400. Test identity/source retrieval, exact final prompt inclusion, publication fidelity and no current-state double transfer. Negative case uses two characters with the same label.

### P8. Model uncertain cost

Deliver exact paid request; simulate timeout after possible remote acceptance. Ensure budget reservation/uncertain attempt persists; no automatic second paid POST, no reroll and no false “free retry.” Only approved reconciliation/recovery may act.

### P9. Shared-party decisions

Two players each own one character in same situation; simultaneous intentions conflict with the same item or travel group. Player A disconnects after submission; player B remains active. Under selected lockstep policy, group resolves once and correctly attributes decisions; no unauthorized acting on behalf.

### P10. Old engine version wakes

Start accepted activity under version X, deploy Y and change implementation of one rule family. Old captured action settles under X's admitted rules; both API/worker versions can read old event. Then prove explicit policy change for **new** actions without altering historical truth.

### P11. Multi-node immutable source

Write candidate document in API/worker A, promote SQL root, read source by hash in different replica B; corrupt a stored object, simulate unavailable object store, restore backup. All readers detect hash mismatch; committed mechanics don't fabricate missing prose. No private object exposure by hash guessing.

### P12. Fairness and overload

One user schedules many optional recaps, another has a required controlling scene and a time boundary. Worker/provider queues do not starve the latter indefinitely. Provider cost caps and per-story/owner fairness hold under a fabricated slow transport.

## Three independent evaluation corpora

**Mechanics corpus:** no-provider, deterministic checks/activities/form/item/time/race fixture pairs with exact receipts and negative assertions.

**Narrative-continuity corpus:** ordinary relationships, lies, rare small callbacks, long gaps, nonhuman identity, missed context, late report and genuine creative originality. Score source-contradiction, choice distinctness, retrieval usefulness, unnecessary prose, player curiosity; model-dependent scores must retain model/version/cost and human rubric.

**Operational corpus:** idle stories, sparse active jobs, hot actor conflicts, SSE reconnect storm, budget exhaustion, deployment rolls, DB/CAS outage. Reports include machine/storage configuration, generated load shape, p50/p95/p99 and unproved axes.

Do not compare narrative results from different models using a fixed random seed and claim determinism. Samples/human judgement need uncertainty and repeatability notes.

## Define “server proof” precisely

A successful worker run is evidence only if:
1. The *production* rule/application/DB path (not an alternate Chamber simulation) executed.
2. A registered, authorized **disposable** database and worker environment were used.
3. Captured input/rules/model mode and seed are known.
4. The game state/receipts were read independently after completion.
5. Replay/fault test had a discriminating negative case.
6. The exact version of code/schema/workflow was recorded.
7. The evidence can be rerun from a clean specimen without hidden manual state.

RNG requires an injectable deterministic source in pure tests; production cryptographic randomness is fine for accepted draws when the result is stored. Never reroll when a worker restarts.

## Scale measurements needed for a credible portfolio

- P50/P95/P99 **command admission** and **snapshot read** as passage history grows.
- DB connection saturation, row-lock wait, deadlock/retry rate.
- Temporal schedule-to-start latency, worker slots and workflow-history growth.
- Outbox pending/aged/poison counts, lease retries.
- Required Storyteller queue time vs provider time vs publication delay.
- SSE connected clients and per-event CPU/network/GET fan-out.
- Cache hit/miss *and* pre-cache authority-check cost.
- CAS latency/corruption/rebuild and backup/restore.
- Per-account and global provider spend + cancellations/uncertainty.
- Activity-boundary lateness versus real scheduled target.

Numbers are only meaningful with a machine profile, DB settings, realistic content lengths and a reproducible scripted workload. Don't invent a “10,000 players supported” badge from a benchmark of 100 no-op functions.

## Human acceptance alongside engineering

After a realistic story session ask:
- **Can you explain what happened during absence?**
- **Was progress genuinely earned and preserved?**
- **Did earlier ordinary acts matter later?**
- **Could you pursue a new intention without the menu making your character feel stupid?**
- **Would you voluntarily return tomorrow?**
- **Which moments felt like supervising a queue rather than inhabiting a life?**

This is where the architecture either realizes the dream or reveals that we built an impeccable job scheduler.

## Reporting schema for every future Change

\`\`\`text
CHANGE: code-bearing outcome and exact product requirement
SOURCE: git commit, source map, rule version/schema/workflow definition
NORMAL: tested trace and expected invariant
NEGATIVE: an incorrect implementation this test would reject
LANES: actual executed Bench/Sandbox/Connected/provider/browser/load
RESULT: commands, measured outputs, pass/fail and unresolved issues
COST: model calls $, DB/reset/deployment side effects if any
LIMITS: what these results cannot establish
NEXT: repair target or owner review gate
\`\`\`

If an assertion cannot distinguish an actual plausible defect, delete or strengthen it. Test-count inflation is not evidence.
