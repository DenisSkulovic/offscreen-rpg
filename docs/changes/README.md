# Code-bearing Changes

**Priority:** [engineering portfolio renewal](../../TODO.md), currently focused on the **internal React/Next.js engineering target**, not gameplay features or visual redesign. This is a code/test/config *implementation queue*, not a list of experiments or documents to write. Read the [Change standard](../../.agents/references/change-work-unit-standard.md) and [workflow skill](../../.agents/skills/change-workflow/SKILL.md).

Current change: none

**No active Change, by design.** The [revised F1–F15 React/Next end-state](../engineering/targets/react-next.md), [November 12 source audit](../engineering/audits/react-next-gap-2026-11-12.md), and the **14 proposed W01–W14** packets are design deliverables, not approvals or an implicit instruction to Cursor. Implementation begins only after the owner reviews the proposed destination, explicitly selects a single Change and authorizes its code/test scope. A selected Change never automatically grants database resets, provider calls or deployment. The historic [November 11 audit](../engineering/audits/react-next-gap-2026-11-11.md) and its original seven packets were critically revisited rather than treated as final authority.

## Queue and dependency guide

| State/group | Future code-bearing Change | Prerequisites and purpose |
| --- | --- | --- |
| **Active** | **None** | No coding agent should pick a Change automatically |
| Parked product work | [S3a continuity report](2026-11-11--s3a-continuity-report/CHANGE.md) | Deprioritized; do not resume as default |
| Foundation | [W01 fast React tests](2026-11-11--web-test-foundation/CHANGE.md) | Usually first; cheap provider-free unit/component proofs |
| Private boundary | [W02 typed Next server reads](2026-11-11--web-server-read-boundary/CHANGE.md) | W01 recommended; private SSR/Nest/session/routing contract |
| State identity | [W03 snapshot ownership](2026-11-11--web-snapshot-identity/CHANGE.md) | After W01; key prerequisite for async work |
| Play state | [W04 recoverable command lifecycle](2026-11-11--web-play-command-lifecycle/CHANGE.md) | W01 W03; immutable intent envelopes, distinct 200/202 |
| Play state | [W05 refresh lifecycle](2026-11-11--web-play-refresh-lifecycle/CHANGE.md) | W03 (W04 desirable); visibility/failure/lifetime policy |
| Component ownership | [W06 campaign composition](2026-11-11--web-campaign-composition/CHANGE.md) | W04; feature cohesion, pure pace definitions |
| Route resilience | [W07 Play error/loading/accessibility](2026-11-11--web-play-route-recovery/CHANGE.md) | W02 W03, W04 as needed; no art/UX redesign |
| Creation independently | [W08 draft editing lifecycle](2026-11-12--web-draft-editor-lifecycle/CHANGE.md) | W01 W02; dirty/revision/conflict/navigation |
| Creation independently | [W09 opening/Start recovery](2026-11-12--web-opening-start-recovery/CHANGE.md) | W01 W02; frozen retry body and GET-first reload |
| Paged readers | [W10 lists/history pagination](2026-11-12--web-pagination-navigation/CHANGE.md) | W01 W02 W03; identity/cursor/late reply |
| Settings independently | [W11 settings/preset lifecycle](2026-11-12--web-settings-presets-lifecycle/CHANGE.md) | W01 W04; unsaved edit and preset identity |
| QA laboratory | [W12 Chamber/QA isolation](2026-11-12--web-chamber-qa-isolation/CHANGE.md) | W01 W03 W05; backend developer-access policy remains separate |
| Architecture checks | [W13 import/type guardrails](2026-11-12--web-import-type-guardrails/CHANGE.md) | W02 W06; cheap testable dependency rules |
| Evidence | [W14 SSR/private-cache/performance proof](2026-11-12--web-private-route-evidence/CHANGE.md) | W01 W02 W03 W07; provider-free connected browser and honest metrics |

**This is a dependency DAG, not fourteen mandatory sequential refactors.** Once W01 exists, W02, W03 and creation work can be staged with separate owners; don't concurrently edit the same modules. A falsifying test may justify **cancelling** a packet instead of changing working code. Existing source may have advanced since the [audited code revision](../engineering/audits/react-next-gap-2026-11-12.md); every selected packet must re-inspect live source before implementation.

## Defining the unit

A Change is one bounded, verifiable future delta to source, tests, scripts or executable configuration, including quality refactors. Pure design, source audit, documentation, visual/UX brainstorming, exploratory test *runs*, QA reports or architecture evaluation are **not** Changes. Don't create a code folder simply to consume tokens or satisfy a checklist. `CHANGE.md` is sufficient for most slices; use optional `PLAN.md` only when resumable execution genuinely requires a checkpoint.

A viable packet links target criterion, source-grounded gap, owning modules and intentional exclusions; names a normal and discriminating failure case; states test side effects and permission. `Proposed` means **no application edits**. `Ready` requires human approval, a current source check and explicit permission.

## Selecting and closing

1. Owner chooses one proposed outcome and approves/refines the architectural contract and any unresolved external-policy dependency.
2. Revalidate current branch/worktree and requirements. Mark only the chosen packet `Ready` with explicit code scope and permitted verification. Replace the one `Current change: none` declaration above with its link; do not implicitly activate siblings.
3. Send [bounded Cursor handoff](../../.agents/skills/cursor-handoff/SKILL.md), specifying authoritative headings, likely source owners, normal/negative proofs, exclusions and receipt.
4. Inspect the diff, run safe proportionate checks, reconcile permanent docs/evidence, close the packet, return `Current change: none`. Git keeps history.

The [legacy feature dossiers](../features/README.md) are initiatives/history, not an alternative execution queue. The owner-retained canon policy stays dormant.

**Session handoff:** [November 12 minutes](../minutes/2026-11-12.md) explain the owner's reasons, the richer target and outstanding decisions. There is no automatic W01 go-ahead.
