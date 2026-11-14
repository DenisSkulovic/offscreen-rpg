# Live Operations | versioned behavior, safe rollout and emergency controls

**Status:** Proposed long-term product target, 2026-11-14; owner review required. **Owns:** the operator experience for changing **future** game behavior at scale, rollout/experiment targeting, cohort impact, pausing and rollback. **Not:** a code editor, production deployment system, provider runtime implementation, commercial billing change, or an implicit authorization to rewrite committed stories. Related: [gameplay forensics](gameplay-worlds-product.md), [AI Operations](ai-engineering-operations-product.md), [authority](authority-operating-policy.md), [domain capabilities](domain-capabilities.md).

## 1. Purpose

LiveOps answers: **What behavior is currently active, for whom, why, and what is the safe path to change it?**

This includes narrative configurations, supported gameplay behavior, model-routing choices, experiment variants, ongoing availability and bounded emergency controls. A change may improve latency and cost while damaging continuity or a player-selected style. The operator must see the intended effect and its blast radius before activation.

The product is *not* an unrestricted production console where any employee can edit prompts, TypeScript, SQL or world state on a Friday evening.

## 2. The relevant categories of change

| Category | Illustrative change | Product decision required |
| --- | --- | --- |
| Narrative presentation | Rewrite a visual/presentation template or nonauthoritative display policy | Who sees it; whether saved passages are re-rendered |
| Storyteller profile/content | Update a style preset, source world package or authoring guidance | New versus existing campaigns; captured creative promises |
| Task recipe / model routing | Change how costly/complex evidence work may be, or provider selection | Cost/latency/quality guardrails; in-flight task continuity |
| Game rules / mechanics | Change action validity, time, consequence/risk behavior | Compatibility with existing committed stories and accepted work |
| Visibility/participation | Alter supported shared-game exposure or consent policy | No silent widening of private content |
| Sponsorship/availability | Pause new provider spend or a broken feature | Whether pending work continues, customer messaging |
| Experiment/offer | Test a bounded feature or approved promotion for a cohort | Honest assignment and measurement; Commercial/Marketing boundaries |
| Data/state migration | Move an existing campaign to genuinely different semantics | Explicit migration policy, safety and affected players |

**All changes are not feature flags.** A code deployment, model-route change, historical state repair and emergency spend pause are distinct operational effects. The Admin may *orchestrate or observe* release decisions without owning arbitrary authoring and deployment.

## 3. Operator surfaces

| Surface | Job |
| --- | --- |
| Live Status | Current environments, active release/experiment exposure, relevant health and provider availability |
| Configuration Catalog | Named, reviewable versions of permitted operational artifacts and their effective scope |
| Release Planner | Proposed change, compatibility classification, eligible target audience, expected effects and rollback plan |
| Cohort / Exposure Inspector | Who was assigned, who is actually exposed, which campaigns and configurations are effective |
| Approval & Schedule | Authorization for specific rollout/mitigation, timing and change ownership |
| Rollout Monitor | Adoption, cost/reliability/quality guardrails, known missing telemetry, ability to pause |
| Incident Mitigations | Emergency stop/rollback with exact scope and outcome verification |
| Campaign Compatibility View | Given a campaign and its commitments, which future behavior will apply and why? |
| Change History | Chronological who/what/why of proposals, activation, deactivation, reversal and effect |

An engineer can inspect current release identity without owning permission to activate it. Support can explain a player's effective version and incident impact without reading internal authoring secrets.

## 4. Existing-campaign compatibility: the crucial product policy

Offscreen campaigns persist for days or years, with earned time, committed consequences, participant choices and source-linked memory. LiveOps must distinguish several **adoption policies**, chosen deliberately per class of change:

| Adoption policy | Suitable conceptual use | Promise |
| --- | --- | --- |
| New campaigns only | Incompatible mechanical/risk changes or new creative defaults | Existing stories keep their declared behavior unless migrated |
| Compatible forward update | Proven-safe presentation or nonmechanical optimization | Existing committed truth stays intact; future behavior may improve |
| Opt-in upgrade | Meaningful player-facing creative/rule change | Affected players knowingly accept supported changes |
| Controlled migration | Necessary version transition with compatibility proof | Explicitly handles current state/active tasks and verifies outcome |
| Emergency restriction/stop | Active harm, unsafe spend, security incident | Can suspend *future* eligibility, not pretend to erase past history |

**Recommendation:** default toward protecting established campaign commitments. New behavior can affect future turns only when compatibility is justified. The exact matrix of permitted automatic/advised/mandatory changes remains an owner decision (AD-P10).

A profile update cannot silently turn a deliberately quiet campaign into mandatory heroic action. A model-route update cannot grant an expired entitlement. Higher pricing cannot grant an AI permission to reroll dice or fabricate earned time.

### Two immutable truths

1. **Already committed mechanical events remain historical fact.** Rollout/rollback does not reroll accepted actions, erase receipts or retroactively transfer inventory.
2. **Already published passages were seen.** An operator may correct them through a defined workflow, but a model rollback alone does not cause readers to un-see them.

A migration and a story fork are not synonyms. A story repair is not a configuration rollback.

## 5. Release lifecycle: staged, measured and attributable

A proposed product journey:
1. **Prepare:** choose one named version/change, rationale, owner, dependencies and expected customer benefit; link to reviewed source outside the Admin where relevant.
2. **Classify compatibility:** does it affect creation only, current-story presentation, in-flight Storyteller tasks, mechanics, risk/visibility or long-lived state?
3. **Select audience:** environment, eligibility and supported cohorts/campaign types. Explain inclusion/exclusion and who might be indirectly affected in shared worlds.
4. **Review effect and fallback:** expected blast radius, provider costs, quality/reliability metrics, change window, known irreversible effects and permissible mitigation.
5. **Authorize:** required approvals bind to this target/version/audience/limits; materially changing the proposal invalidates the approval.
6. **Activate progressively:** deploy/enable only the allowed audience and track actual exposure, not just configured percentages.
7. **Observe:** user outcomes, regressions, error/latency, spend, continuity, complaints and uncertainty, with freshness/coverage.
8. **Pause/rollback/expand:** act within authority; rollback only future behavior that is genuinely reversible.
9. **Verify and close:** identify actual effective versions, outstanding in-flight or historical effects and required player communication.

The terms *draft*, *approved*, *scheduled*, *activating*, *active*, *paused*, *rolled back* and *partially applied* should reflect verified states. An approved proposal is not yet active.

## 6. Emergency controls: precisely defined effects

Emergency controls must exist for a paid-provider business, but "Kill Everything" is not an adequate product definition.

| Control | Intended emergency effect | What it does **not** promise |
| --- | --- | --- |
| Stop new sponsored model work | Reject or hold new eligible sponsored dispatch while preserving readable existing play | Reverse already incurred external spend |
| Pause a specific model/task route | Prevent unsafe future work for a named route/task/cohort | Cancel every in-flight task with certainty |
| Disable a defective feature for an audience | Gate new use of a bounded capability | Undo prior published consequences |
| Halt rollout / restore known configuration | Stop expansion; return compatible future operations to earlier version | Rewrite old campaign history or force in-flight captured tasks to rebind |
| Restrict risky account/cohort activity | Reduce abuse or exposure under separate Trust/Commercial policy | Confiscate paid customer rights without defined process |
| Controlled campaign recovery | Explicitly resolve proven state corruption in a named story | A generic platform rollback |

**Product priority:** a narrowly authorized incident responder should be able to stop **new** runaway funded dispatch immediately, with proportionate audit and rapid verification, without possessing unrestricted financial, privacy or world-editing power.

When work has already been legitimately accepted, the system may need to settle or hold it at its supported boundary. The operator view must explain the effect on existing commitments; it must not claim all fictional progress is instantly undone.

### Unknown impact is not permission to continue blindly

If billing telemetry is missing or provider charges are uncertain, LiveOps must display exposure as **unknown**, not reassuring zero. Conservatively stopping fresh spend may be safer than permitting unlimited attempts. The exact operational stop policy and emergency exceptions still require approval.

## 7. Cohorts, experiments and player promises

A mature experiment needs:
- hypothesis and intended target (e.g. lower cost for equivalent quality);
- assignment population and exclusions with preserved authority/consent;
- actual exposure evidence and meaningful comparison groups;
- primary outcome and guardrail measures across **cost, reliability and game quality**;
- start/stop and customer communication rules;
- a plan for existing campaigns after the experiment.

A random cohort assignment does not imply authority to alter a player's chosen Storyteller risk, private-data exposure or already accepted rules.

**Shared campaigns are a complication:** if members could receive contradictory mechanical behavior in the same authoritative story, the change should be campaign-scoped or otherwise governed by an explicit compatibility model. Do not randomly assign two incompatible rule engines inside one shared world.

Do not portray a cohort as successful merely because all measured failures were excluded, or because the rollout only measured users who returned.

## 8. Inter-team handoffs and operator promises

- **Engineering** owns diagnosis of what failed technically; **LiveOps** owns approved behavior activation/mitigation; **Game Design/Product** evaluates gameplay and profile fidelity.
- **Commercial** defines funding/allowance economics; LiveOps may stop a dangerous exposure but does not rewrite financial transactions.
- **Support** can find the effective release/version and customer impact; it does not need the ability to activate production.
- **Trust/Privacy** owns special restrictions or sensitive safety decisions, not hidden global creative taste controls.
- **Security/Governance** ensures staff approval, actor attribution and emergency accountability.

One incident and one underlying release should be linkable across these perspectives.

## 9. Worked product journeys

### L-01: narrator update is better on benchmarks but flattens player personality
LiveOps proposes a profile/task version. A sampled evaluation shows improvements in generic repetition score, but quiet-player feedback indicates unwanted hero pacing. The rollout is stopped or narrowed, then reviewed against profile fidelity. Existing published prose remains historical; future calls use an appropriate version. No generic "more exciting = better" override.

### L-02: new AI route triples cost
Engineering links an abnormal spend cohort to a named route. Authorized LiveOps stops new dispatch to that route, preserving existing readable campaigns. Actual in-flight charges remain uncertain until reconciled. Finance tracks financial exposure, Support sees affected cases, and any compensation remains separately authorized.

### L-03: rules update with active shared campaigns
A mechanics change could alter accepted durations or risk. The Release Planner classifies compatibility and shows affected active work/shared participants. Until a valid migration policy exists, the affected campaigns remain on compatible behavior; new campaigns may adopt the changed rules. A deployment is not permission to pretend old commitments never existed.

### L-04: experiment with a trial offer
Growth prepares a trial cohort; Commercial approves funding and earned-grant behavior; LiveOps activates the relevant on-platform eligibility experiment. Actual exposure and conversion are measured with defined windows. Halting the experiment does not silently confiscate previously awarded entitlements.

## 10. Negative acceptance

- A prompt/profile change is approved but never activated; Support does not report it as current.
- A rollback occurs after state corruption; Admin shows the corruption and outstanding repair rather than claiming rollback fixed history.
- A mechanical rules variant would split two participants in one shared world; the rollout is prohibited or subject to a legitimate common policy.
- A staff member with read-only release access cannot operate a global stop through a deep link.
- A narrow stop does not silently freeze purely deterministic, still-authorized game work unless its policy actually requires it.
- An experiment improves average latency but worsens continuity for a cohort; the quality regression remains visible.
- Telemetry for a cost threshold disappears; Admin shows unknown and can route to an appropriate conservative response.
- An active task still uses a captured older version; the operator can identify this instead of assuming latest deployment rewrote it.
- A cost pause is lifted without resolving entitlement or account restriction; access is not falsely granted.
- A live model rollback does not permit a second charge or redraw of an already accepted game action.

## 11. Decisions still open

AD-P04/15: release approvals and emergency authority; AD-P09/22: budget/allowance controls; AD-P10: version adoption, pin/migration policy and active-task continuity; AD-P12: experiment eligibility; AD-P13: notification; AD-P26: which operational artifacts can be authored/published through Admin versus controlled elsewhere.

No rollout percentages, rollback mechanics, release-tool selection, deployment architecture or production kill-switch implementation are decided here.
