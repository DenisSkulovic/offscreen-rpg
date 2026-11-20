# DIST04 | Composer optional postcommit projection, never Rabbit-to-Temporal

**Baseline:** 584b594. **State:** Proposed/unselected. **2026-11-20:** DIST02 Cancelled (not Done), so this packet has no fact DTO or named consumer; T01–T03 are non-executable without an independently approved new requirement. Historical folder name is misleading; actual Change body explicitly supersedes Rabbit as a Storyteller wake path. **Model:** Composer Standard; no active critical-path task. **Source:** `apps/worker/src/outbox/{relay,dispatch}.ts`, `packages/workflows/src/contracts.ts`, `docs/technical/platform/execution-and-delivery.md`.

## T01 | Strict topic classification in existing relay | NOT AUTHORIZED: no consumer/contract
Do not change current wake mapping: `storyteller.profiled.v1`, campaign actions, activity and time notices keep direct Temporal start/signal. Add only a **separate** versioned postcommit fact topic for Rabbit publisher, confirmed only after durable SQL commit. Producer confirms broker accept before marking that **fact notice** delivered; broker failure leaves projection fact pending, not gameplay. Positive: direct wake count identical with broker up or down. Negative: a wake notice routed to Rabbit is rejected by explicit test.

## T02 | Independent bounded inbox consumer | GATED
One small separate consumer handles one derived view with eventId unique inbox, revision/root-pinned facts, no authority to write story/campaign/scene checkpoint, no ability to start Temporal. Test duplicate/out-of-order/redelivery. Keep its schema/projector independent of GA publication transaction, no hidden usage or source-of-truth claims.

## T03 | Optional disposable broker proof | GATED ON REAL APP + OWNER
One cluster operator, one source image and one known published scene; stop Rabbit and confirm game continues to scene+SSE/GET while derived projection lags/replays. This **cannot** gate TURN03 first POC. **No Grok reason: tests define the algorithm.**
