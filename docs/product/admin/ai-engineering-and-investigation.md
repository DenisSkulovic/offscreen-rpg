# AI engineering and investigation

**Owns:** how staff explain a Storyteller task: what was admitted, what was attempted, what committed, what the player saw, and what it cost.

**Technical companions:** [forensic read contract](../../technical/observability/investigation-and-reconstruction.md), [request cost](../../technical/storyteller/request-context-and-cost.md).

**Status:** proposed workspace, 2026-11-14. Some redacted diagnostic reads exist from the Admin and observability slices. Those reads are not this workspace, and they are not a production grant to open raw prompts. No observability implementation, storage scheme, provider policy or alert threshold is selected here ([illustrative examples](README.md#what-this-section-establishes-and-what-it-does-not)).

An investigator explains a task through role-scoped evidence in disclosure tiers. Each tier is a separate grant, and nothing is inferred from missing data. An incident review is staff diagnosis of the task, not a replay of the player's game.

## Units that must keep their names

The console must describe the runtime that actually ran. It must not draw an agent loop because a target document expects one. The selected target is a bounded task inside the living-world loop. The landed prototype may be narrower. Both facts stay visible.

| Unit | Is not |
| --- | --- |
| Accepted player command | A model request |
| Mechanical receipt | A passage or a payment |
| Storyteller task | One model round, or one game hour |
| Model round | The whole turn. A task may have zero, one or many |
| Evidence read | A free authoritative game action |
| Candidate | A committed world fact |
| Validation | A prose quality score |
| Publication | Mechanical settlement or a provider callback |
| Cost event | A successful customer experience |
| Incident | Every exception |

A task can spend money and still fail. A settled mechanical result can still be waiting on narration. A derived report is not the current playable offer. Zero model calls during a quiet authorized activity can be the correct operation.

## What "why did this happen?" shows

1. Why the task was admitted, and for which campaign, participant, command or maintenance reason.
2. The captured world, rules, profile, purpose, funding and version.
3. Which evidence was admissible, used, missing or stale.
4. Which model route and rounds actually occurred, including "no further investigation."
5. Proposals, validation, rejection, bounded repair, or abstention, with reasons that are safe to show.
6. The mechanical receipt, if any, and the published passage or report, or an honest blocked/stale publication.
7. What the player experienced, whether play is held, the allowance effect, the provider expense, and any internal diagnostic budget.

Missing instrumentation is **unknown**, not a fictional planning step. An expensive round is not proof of a deep investigation.

### Disclosure is not one permission

| Tier | Contents | Grant |
| --- | --- | --- |
| A. Aggregate | Attempts, outcomes, delay, cost class, error class. No personal content | Ordinary operational read |
| B. Scoped summary | Identifiers, sequence, versions, coverage, redacted outcome | Task investigation |
| C. Sensitive context | Raw prompts, source passages, participant-private material, model replies | Separate, purpose-limited, audited. **Not** implied by A or B |
| D. Secrets | Credentials and nonessential secret material | Not an Admin debugging view |

Tier C is separate from Tiers A and B. Holding the aggregate or scoped-summary permission, including metadata permission, never opens a raw provider packet or prompt. S3 raw-prompt access in the forensic contract is this Tier C; it is not a production Support grant and not `ai.operation.read`. An engineer with a redacted trace and no private-narrative permission cannot open the prompt, and most failures should be diagnosable without Tier C.

Quality is three lenses, not one fun score: mechanical and source correctness; profile and continuity fidelity; what the player actually reported. A contemplative session is not a failure because it has no combat. A syntactically valid passage that grants an unearned item is a correctness incident.

Provider cost and customer allowance are different ledgers. A sandbox run spends the internal diagnostic budget. It does not reduce a customer's allowance. Unknown or stale spend is not "under budget."

## Incident shape

Classify cost overrun, disclosure, rules or canon violation, provider outage, latency, and subjective regression separately. They do not share one responder. An incident review reads role-scoped evidence about the task; it is never a replay of the player's story, and absent data is reported as unknown.

**Normal.** A model route becomes slower and more expensive. One incident names the task types, route and window. Engineering reads evidenced rounds, retries, errors and funding. LiveOps may propose a targeted stop of *new* dispatch under its own authority. Finance reads exposure. Support sees customer symptoms. Recovery is judged on gameplay outcome, not on a lower HTTP error rate. Stopping new dispatch does not cancel a charge already in flight. A rollback does not unpublish a passage that already went out; repair is a separate action.

**Negative.** Do not replay a timed-out charged call and bill twice. Do not reroll a settled action because narration failed; show the valid receipt and the pending passage. Do not invent tool steps for a one-call operation. Do not treat a quiet hour with no model calls as an outage. Do not copy unredacted story text into a general support note. Do not read a missing metric or an absent trace as zero cost, zero rounds or "nothing happened". Do not turn an incident review into a replay of the player's story.
