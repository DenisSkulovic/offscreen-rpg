# Forensic observability | Next owner decision after OBS05 and OBS02-H

**Status: decision/handoff draft, 2026-11-15.** Source reviewed `main@18158402`. [Original wave-5 handoff](wave5-evidence-quality-2026-11-15.md) retains its dated design history; this document supersedes it for **next-Change selection**. **Current change: none.** No code, migration, provider call, monitoring deployment or new staff grant is authorized here.

**Execution runbook for Cursor (new owner request):** [S0–S6 autonomous forensic trial](CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md), including actual local stack/campaigns, source evidence, fault injections, safe OBS06→OBS07 code trials when authorized, conditional capped real model test and [FINAL-HANDOFF](../evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md). **Prepared, not executed.** This is a real evaluation schedule, not authorization to begin merely because the Markdown was committed.

## 1. Verified state, no stale “Proposed” labels

| Work item | Actual state | Evidence level and limitation |
| --- | --- | --- |
| OBS00-A | **Done** | Live worker forwards full `(task,dispatch)` override through wrapper, provider-disabled proof |
| OBS00-B | **Blocked** | Independent current usage/entitlement resolver missing; normal paid provider dispatch not authorized. **Never** use frozen task as current authority |
| OBS01 | **Done** | Campaign operation discovery includes captured/held G before any provider attempt, redacted only |
| OBS02 | **Done** | Real SQL stage receipts for sampled scripted/capture/publication paths, not universal AI/worker trace |
| OBS02-H | **Done** | Epoch-scoped start/terminal identities, start/lease co-commit, CAS-fenced terminal receipt, conflict detection |
| OBS03 | **Done** | Same-G consequence prompt/task metadata sidecar; **not** per-attempt verified transport packet |
| OBS05 | **Done** | V2 lineage: packet-included-but-uncited ≠ model-ignored; v1 fixtures preserved |
| OBS04 | **Proposed** | First mechanically authoritative finite-action E0 state transition witness; SQL/codec/lock-cost gate |
| **OBS06** | **Proposed (recommended next)** | Case-scoped Support Situation → Why **read-only** source service and exact S1 role/case/campaign grant |
| **OBS07** | **Proposed, depends OBS06** | First human Support Situation panel, no private content or new permission logic |

**No giant observability platform is implemented yet.** No protected raw-artifact TTL, developer raw Context Workbench, player Replay, whole-world E0 history or production OTel/Grafana stack. No executed/sent-packet equality proof for every paid round.

## 2. Decision: what should be next?

**Recommendation: OBS06 as next *implementation candidate***, rather than OBS04 or OBS00-B, **for the immediate stated observability/Support product goal**.

| Candidate | Why it matters | Why not selected next |
| --- | --- | --- |
| **OBS06 Support Situation read** | First human-usable real incident answer from already persisted OBS01/02/03/05 + campaign facts. Exposes actual missing source, safety and cost gaps before adding another DB ledger | **Chosen direction**; requires policy acceptance of granular case/campaign grant and trusted assignment issuance |
| OBS04 E0 finite-action transition | Foundation for precise historic before/after mechanics and mechanical replay | Adds SQL writes/codec/lock risk; ordinary Support current-status diagnosis doesn't need a complete historical ledger yet. Remains important next backend phase |
| OBS00-B independent current usage policy | Necessary to enable safe paid Storyteller traffic | **Pre-live release blocker**, not required for provider-disabled S1 investigation. If real paid gameplay launch becomes the goal, move OBS00-B to first priority |
| Production OTel/Grafana | Operational timing/health and cross-service latency | Can't replace actual source/permissions or give Support the original game state; defer until first native investigation proves utility |
| Protected raw prompt archive | Long-term exact context inspection and retention | Legal/privacy/cost/deletion not accepted, current SQL JSONB already contains raw copies |
| Developer S3 Context Workbench | Original intended elite engineering UX | Needs exact packet/producer provenance and purpose-bound sensitive disclosure; premature to expose protected bodies |

**Do not mark OBS06 Ready automatically.** The owner still needs to accept the specific new S1 Support permission and source/case binding, and explicitly authorize its code Change. The design is ready for review, not a security approval.

## 3. What the next Support slice will actually deliver

[Source audit](../evidence/obs06-support-situation-source-audit-2026-11-15.md) → [strict technical/authorization contract](../technical/support-situation-and-why-v1.md) → [OBS06 Change](../../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) → [OBS07 UI](../../../../work/changes/archive/2026-11/observability/2026-11-15--obs07-support-situation-ui/CHANGE.md) after OBS06 verified.

**OBS06:** one body-free, bounded case-bound Admin GET. It returns **current hold/commitment**, controlling G when source-linked, last published passage ID, recent typed GM05 developments, stage/publication status and a few deterministic **Why** claims with original source IDs and explicit gaps. No speculative model narrative, raw prompt or player prose.

**OBS07:** visible Support area with Situation → Why → source refs, one existing case, stable query keys and no arbitrary game/admin data explorer. It will not create/approve campaign links or grant staff permissions.

**First proof case:** original player action becomes interrupted, consequence G captured, CAS unavailable and G held. A legitimate Support investigator opens the assigned campaign case and sees **actual interruption, no successful receipt, held materialization, no fabricated paid model round**, then can escalate the safe G/event IDs. An unauthorized case creator cannot inspect a foreign campaign.

## 4. The authorization issue is a real independent work item

**Important source facts:**
- `support-operator-v1` has case/player summary, **not** `ai.operation.read` or `campaign.metadata.read`.
- `AdminController.createCase` checks a linked `player` but not a linked `campaign/operation/account`.
- `admin_case_link` is a reference, and `case.assign` does not by itself grant any campaign-specific diagnostic capability.
- Existing Admin policy can evaluate `requireAuthorizedCaseAssignment` but a self-supplied case ID is insufficient and **exact campaign grant scope must be nonempty** for this new capability.

**Selected design:** a separately assigned `support-investigator-v1` package with `forensics.campaign.situation.read` scoped to one trusted case+campaign binding, active assigned case, source validation and no narrative contents. Do **not** silently broaden Support Operator v1 or treat a self-created case link as authorization.

**Owner/security gate before Ready:** approve the restricted S1 disclosure and who is allowed to issue **independently verified exact case/campaign grants**. If the grant/verification process is missing, stop the read rather than ship a useful-looking access vulnerability. This is a small security prerequisite, not an invitation to build the whole Admin approvals platform in OBS06.

## 5. Sources and negative evidence we deliberately preserve

- **Stage**: OBS02-H real epoch/lease receipts, with strict scope and chronological limits.
- **Prompt metadata**: OBS03 exists for promoted consequence G, but S1 does **not** return its full manifest or source hashes by default.
- **Lineage**: OBS05 v2 remains a diagnostic adapter; “included but uncited” does not mean model ignored a source.
- **Current authority**: `campaign.holds` and current story revision/active commitment identify controlling state, not newest historical report G.
- **Mechanics**: GM05 source event kinds and original execution/receipt rows support simple factual conclusions, **not** arbitrary historical state reconstruction.
- **Privacy**: `storyPublicEvent.title/summary` may be player-visible prose, but is **not** automatically Support-safe. S1 selects only kind/source/time, never these strings.
- **Operational**: source rows survive trace sampling/retention; missing OTel span is not “no action”.
- **Commerce**: do not present missing provider attempt as €0. OBS00-B means the **default current worker** still denies paid dispatch absent authority, not proof about every historic attempt or other adapter.

## 6. Honest delivery milestones

1. **D0 Design and policy:** owner accepts exact case-bound S1 permission and read response, checks source writer/case relationships. Still no code.
2. **D1 OBS06 implementation:** safe typed Admin read, verified case/campaign grant, provider-disabled disposable DB normal and foreign-case negative tests; measure query cost.
3. **D2 OBS07 implementation:** a rendered, accessible Support Situation screen showing actual captured fixture from the verified endpoint; no hidden raw data or blanket privileges.
4. **D3 Human proof:** a non-engineer can correctly explain one stuck/held/interrupted case without SQL, logs or coding agent. Record time to answer and mistaken assumptions.
5. **D4 Next engine evidence:** use investigation gaps to decide exact OBS04 E0 writer pilot or additional G/packet source work, not an automatic mega rewrite.

**What would change this order?** If the owner explicitly chooses **launching real paid LLM campaigns before building the Support experience**, OBS00-B and final provider-wire custody immediately become top priority. If the primary requirement becomes **arbitrary historical mechanical state time travel**, OBS04 takes precedence after its lock/codec gates. For today's complaint-driven forensic product, OBS06 is highest marginal utility.

## 7. Cursor execution constraints

**Only one Change at a time.** The current GitHub branch is documentation-only. Do not merge this handoff as permission to implement code or to change staff grants in running environments.

**Read just enough:** OBS06 first-screen packet → exact case/permission audit → query schema contract → 2–5 source-owner files; don't preload the whole 40-document observability program. Provider-free fixtures, no automatic database reset, no real player content, no external paid testing. Return source SHA, test commands, safe response and negative case result.

**Ready gate:** explicit owner authorization of **OBS06** and S1 case-binding policy, then mark exactly that packet Ready; otherwise keep `Current change: none`. OBS07 remains Proposed until OBS06 is Done. OBS04 and OBS00-B retain independent design/launch dependencies.
