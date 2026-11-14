# Cross-workspace coherence | product-design review

**Status:** Proposed product review lens, 2026-11-14. **Owns:** checking that Commercial, Gameplay, AI Operations and LiveOps tell one consistent story. **Not:** an approval record, a system architecture, technical data contract, or implementation Change. Review the full domain owners: [Commercial](commercial-operations-product.md), [Gameplay](gameplay-worlds-product.md), [AI Operations](ai-engineering-operations-product.md), [LiveOps](live-operations-product.md); [Player 360](player-360-service-blueprint.md), [Authority](authority-operating-policy.md), and [operator journeys](operator-journeys-and-interaction-contracts.md).

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

## What cannot be accepted yet

The four workspace specifications are substantial but remain proposed. We have **not** settled:
- subscription/allowance and sponsorship policies;
- shared-campaign payer/beneficiary/ownership and notice;
- precise repair, replay and historical-correction permissions;
- LiveOps compatibility version matrix or emergency stop obligations;
- sensitive prompt/story exposure policy;
- which metrics and data coverage justify operational decisions;
- all required stakeholder journeys for Growth, Trust, Privacy, support communications and access governance.

Those are owner/product decisions, not reasons to improvise technical infrastructure.

## Next product review order

1. Owner critique of these four workspace promises and their open decisions.
2. Apply the same level of specificity to Support & Cases, Growth & Insights, Trust & Privacy, Command Center and Staff Governance where still underspecified.
3. Run adversarial cross-workspace scenarios, including unauthorized staff access, shared-game consent, external billing ambiguity and active-task compatibility.
4. Record accepted versus deferred business policy in the [decision register](decisions-and-readiness.md).
5. **Only then** assess product-design completion and begin technical architecture. Implementation Change folders come after technical approval.

This is a design-check document, not a green light to code.
