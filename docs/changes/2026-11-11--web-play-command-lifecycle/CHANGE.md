# Change W04 | Typed immutable Play intent and uncertain HTTP lifecycle

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W01 + W03; coordinate W05/W06/W11 source ownership, do not parallel edit command owners.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F3 F5 F11**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G12 G16 G17**.  
**Desired single code/test/config outcome:** Play choices, controls, accepted campaign actions and recovery operations capture exact intent and payload once, expose correct state in React, and reconcile responses through W03, without confusing server admission (202) and publication.

**Observed source owners:** `apps/web/src/features/play/view.tsx`, `apps/web/src/features/play/use-campaign-command.ts`, `apps/web/src/features/play/resolution-recovery.tsx`, `apps/web/src/lib/story-transport.ts`, `apps/api/src/modules/stories/controller.ts` (read), shared schemas (read).

## Proposed design contract (not an invitation to redesign)

Model `IntentEnvelope` keyed by viewer/story/command kind with stable operation ID, target URL, typed immutable expected revision/body, and explicit submitted/unknown/conflict/accepted states. Keep endpoint-specific builders and permitted reactions: `resolutions` 202 is admitted; controls/settings/action variants can acknowledge a current snapshot; `409` requires authorized refresh; `400` needs actionable validation; `401` reauth; network timeout means **unknown completion**. If already uncertain, retry only the **same** full envelope when endpoint idempotency is verified. Disable incompatible intents and show a recoverable control from state, not a render-invisible ref. A page reload cannot reconstruct ordinary operation refs; refresh the authoritative story and, if outcome remains unknowable, display a safe blocked state rather than issuing a new UUID.

## Expected bounded implementation

1. Add narrow typed command envelope/status classification and unit tests; document per-endpoint semantic differences.
2. Migrate ordinary Play response/control while preserving server-pending resolution messaging and old error copy as far as compatible.
3. Migrate campaign hook/recovery path without collapsing distinct commands into `send(anything)`; ensure view state owns visible retry.
4. Verify response identity and W03 snapshot dispatcher, including mounted lifetime, unmount and no automatic reload submit.

## Falsifiable acceptance and proof

- **Normal case:** One user choice issues one frozen UUID/body, renders submitting then server-admitted pending status and eventually reconciles saved published snapshot.
- **Discriminating negative case:** Lost ACK after commit, double click, delayed old 409 and midflight navigation never generate a second business intent or reset newer snapshot. A mock proves same wire retry; an existing real Nest integration proves actual dedup separately.
- **Check and evidence:** Web component FSM tests with deferred promises, tagged HTTP-fault fake; narrow real integration test using existing disposable DB only with explicit test permission. No paid provider or invented 'exactly once' claim from a client test.
- **Completion receipt:** For every migrated command list ID/payload/response/allowed recovery; show exact test and whether backend duplicate-effect result was actually exercised.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No backend idempotency migration, automatic provider replay, new state library, all-screen universal dispatcher, new game behaviors or persistent localStorage mutation queue.
- **Principal risk:** A 202 receipt is not a settled narrative. Abort is not server rollback. A full reload may lose original operation identity; document safe refusal rather than pretend durable recovery.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F3 F5 F11**, audit **G12 G16 G17**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
