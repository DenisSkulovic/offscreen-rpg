# Cross-workspace coherence | product-design review

**Status:** Proposed product review lens, 2026-11-14. **Owns:** checking that Commercial, Gameplay, AI Operations and LiveOps tell one consistent story, with other staff workspaces seeing permissioned projections of that truth. **Not:** an approval record, a system architecture, technical data contract, or implementation Change. Review the full domain owners: [Commercial](commercial-operations-product.md), [Gameplay](gameplay-worlds-product.md), [AI Operations](ai-engineering-operations-product.md), [LiveOps](live-operations-product.md); [Player 360](player-360-service-blueprint.md), [Authority](authority-operating-policy.md), and [operator journeys](operator-journeys-and-interaction-contracts.md).

## The central product model: four kinds of truth

An operator investigating a failed play session should be able to distinguish four independent but linked realities:

1. **Commercial truth:** was the customer entitled and funded to request the relevant operation, what allowance was reserved/consumed, and who bears its cost?
2. **Gameplay truth:** what player/world action was admitted, how far fictional time legitimately progressed, which receipts/state were committed, and what was published?
3. **AI execution truth:** which task and model attempts happened, what evidence was read, what was rejected or published, and what provider cost or uncertainty remains?
4. **Operational truth:** which version/configuration/incident/stop applied at the time, and what interventions changed future behavior?

**One operation need not succeed in all four.** A paid provider request can cost money while the game remains legitimately held. A mechanical action can settle while required narration is still pending. A rollout can be active for new campaigns but not an already pinned story.

Do not collapse the four into a universal "Success", "Premium", "Ready" or "Turn Used" boolean.

## Information-source and responsibility matrix

| Subject / question | Best operator home | Cross-links, not competing owners |
| --- | --- | --- |
| Is a beneficiary allowed to dispatch a specific paid task? | Commercial Effective Access | Player 360 summary; AI admission; LiveOps stop |
| What happened to inventory, time, choices, consequences? | Gameplay & Worlds | AI cause/trace; player case |
| What did the model actually read/attempt and how much did it cost? | AI Operations | Gameplay publication; Commercial funding |
| Which version was effective and who changed it? | LiveOps | AI executions; incident; administrative audit |
| Who may inspect raw private source content? | Access & Governance / privacy rules | All four workspaces enforce the same bounds |
| Who needs customer communication or a service remedy? | Support & Cases | All four supply references/evidence |
| Who may pause sponsored spend versus refund payment? | LiveOps incident authority versus Commercial financial authority | One identity may have both packages, but actions remain separate |
| Was a repair completed and appropriate for all affected participants? | Gameplay repair record and Admin action history | Support case, approvals, LiveOps version |

Each record should have a stable operator-facing reference; a coworker's deep link must not confer new permissions or reveal forbidden metadata.

## Five diagnostic exercises to pass before technical architecture

### R-01: charge occurred, no passage published
Commercial: funded allowance status may be pending/held, not necessarily consumed. Gameplay: mechanical result might already be committed. AI: provider work billed or uncertain, publication failed. LiveOps: release health/incident state. A single recovery plan must avoid duplicate commands, rerolls and automatic duplicate spending.

### R-02: expensive Storyteller regression after deployment
AI: cost by task/round and actual user success. LiveOps: effective version/cohort and safe future rollback. Commercial: company budget and possible compensation exposure. Gameplay: which existing stories remain pinned, which state/published history cannot be reverted. Support sees affected subjects without raw story access by default.

### R-03: repaired shared campaign
Gameplay: identifies exactly which common facts and active commitments change. Player 360: participant boundaries and visibility. Authority: requires legitimate scope and review. Commercial: internal debugging/replay is not charged to the players. LiveOps: repair is independent of release rollback. Audited correction is visible without overwriting old cause history.

### R-04: free-tier abuse versus ordinary high engagement
Commercial: unexpected sponsorship exposure. AI: repeated costly retries or task patterns. Trust: evidence-based review, not automatic guilt. LiveOps: targeted protective limits, not indiscriminate story deletion. Support: reasonable customer explanation and appeal. A legitimate paid account does not automatically gain exemption from safety/cost policy.

### R-05: a quiet campaign has few AI calls
Gameplay: a long accepted activity may progress and still be healthy. AI: no model round is required during legitimate quiet work. Commercial: no provider charge merely for simulated time. LiveOps: no false model-idle alarm. Product metrics must not automatically equate engagement with generation frequency.

## Shared operational rules

- **Explain the subject:** payer, player, membership, campaign, task, model round, receipt, passage, grant, release or incident are distinct labels.
- **Explain the time:** game fictional time, real event time, provider latency, billing window and reporting freshness do not share one clock or meaning.
- **Explain evidence:** authoritative, derived, estimated, pending, stale, unavailable or disputed.
- **Explain ownership:** commercial access is not game-world authority; model output is not a settled receipt; LiveOps rollback is not temporal rewind.
- **Explain data visibility:** a Support/Finance/Engineer link shows only what the viewer may legitimately see. Bulk export/raw prompts require separate permission.
- **Explain intervention:** action composer, bounded approval, execution and verification are separate; irreversible effects need clear warning and follow-up remedy.
- **Explain funding:** model work costs the company even when the player has no billable accepted result. Internal replay belongs to an internal budget.
- **Explain uncertainty:** when telemetry, payment state or provider outcome is unknown, show uncertainty instead of zero/green success.
- **Explain player impact:** other participants, contractual promises, earned work and previously seen narrative cannot be made to disappear by a UI toggle.
- **Explain product scope:** desired Admin behavior does not prove the current engine implements it.

## Extended responsibilities across the remaining workspaces

- **Support & Customer Success:** compose customer-facing explanations and case remediations from permissible facts. A case link may identify an issue without exposing raw prompt, Trust allegations or another participant's data.
- **Growth & Insights:** distinguish human action from offscreen simulation and provider work; correlate retention, reliability and economics without conflating accounts, campaigns and payers.
- **Trust & Privacy:** protect restricted evidence, handle generated-versus-player content provenance, manage appeals and verified data-rights requests even where shared history or processors complicate completion.
- **Command Center:** compose queues and metrics without becoming its own data or authorization owner. Saved links and notifications are also sensitive output surfaces.
- **Access & Governance:** enforce bounded grant provenance, case-assignment restrictions, independent approvals, staff lifecycle, delegated session revocation and audit review.

### Additional cross-workspace tests

| Exercise | Required coherent result |
| --- | --- |
| Support self-assigns a case about a high-profile player | Case assignment itself does not unlock protected raw narratives, grants or secret account existence |
| Trust links an allegation to an ordinary Support case | Support sees safe restriction/appeal info, not reporter identity or confidential evidence |
| CS follows up with a dormant player | Only permitted onboarding/engagement facts and contact preferences; no covert story-content profiling |
| Growth reports "daily engagement" while world work runs offline | Counts of actual human action and campaigns remain separate; model calls are not DAU |
| Privacy request references one member of a shared campaign | Account rights, shared published history, other members and external processors are separately assessed |
| Operator revocation occurs with a pinned Command Center card | Cached titles/details/actions lose effective access; pending work is reassigned |
| Emergency cost stop during pending mechanical action | Future funded dispatch can be restricted without pretending prior game time, provider spend or contractual rights were erased |

The [adversarial product review](product-adversarial-review.md) expands these tests into explicit failure modes. The [decision brief](product-policy-decision-brief.md) groups outstanding product choices.

## What cannot be accepted yet

All logical workspaces have **proposed product specifications**, but broad documentation coverage is not approval. We have not settled customer metering and sponsorship promises, shared-campaign rights and notice, acceptable repairs, version adoption, private-story access and consent, scope escalation via case assignment, emergency separation of duties, trusted identity recovery, rights-request retention/processor policy or defensible metric definitions.

The [decision register](decisions-and-readiness.md) stays the formal status owner. Do not improvise unresolved policy as middleware configuration or allow a UI workflow to make the decision by default.

## Next product review order

1. Owner challenges [product policy decision brief](product-policy-decision-brief.md) and high-severity [adversarial scenarios](product-adversarial-review.md).
2. Accept, revise or intentionally defer each gate-relevant capability at its owning product document.
3. Re-walk multi-role, shared-campaign, cost-uncertainty and privacy journeys with the chosen rules.
4. Reassess [product completion gate](decisions-and-readiness.md#product-design-completion-gate) with owner acceptance.
5. **Only then** begin technical architecture. Cursor Change folders follow approved technical design.

This is a design-check document, not a green light to code.
