> **Not the canonical contract.** Selected norms live under `docs/`. This parked note does not authorize implementation.

# Offscreen RPG | 2026-11-15 design pipeline handoff

**Purpose:** tell the owner and Cursor exactly which residual designs are specified, which implementation code already exists, which packets must stay Proposed, and what is genuinely next. **Source basis:** GitHub main at 8b7157f (2026-11-14), source files individually inspected 2026-11-15. This is **not** a code authorization, test execution receipt or production claim. The active [Change index](../../../../../../changes/README.md) must remain `Current change: none` until the owner selects one.

## Design decisions authored in this wave

| Item / scope | Contract | Code-bearing packet | Decision and gate |
| --- | --- | --- | --- |
| **ENG03-C1-R:** provisional G recovery | [Recovery V1](../../../../engine-studies/decisions/eng03-provisional-recovery-v1.md) | [C1-R](../../../../../../changes/archive/2026-11/eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md) | Specified. Explicit operator-only, audited same-G rearm after transient attempt exhaustion; no player retry or provider spend. **Owner approval + actual auth/audit fence verification still needed** |
| **ENG03-C2:** interrupted-action capture | [Interrupted source/DTO V1](../../../../engine-studies/decisions/eng03-interrupted-action-capture-v1.md) | [C2](../../../../../../changes/archive/2026-11/eng/2026-11-15--eng03-c2-interrupted-action-capture/CHANGE.md) | Specified for **required-item-holder-changed** only. Must measure current lock-held CAS and prove C1 compatibility before implementation |
| **GM04:** failed persuasion distinctness | [Gary approach memory](../../../../experience-studies/decisions/gm04-failed-approach-v1.md) | [GM04](../../../../../../changes/archive/2026-11/experience/2026-11-13--gm-offer-distinctness/CHANGE.md) | Specified authored fact transition, changed valid next options, fixed failed roll. Confirm fixture/current schema and approve scenario |
| **GM01 → GM02:** custom intention pilot | [Template-first + cost policy + 30-intent corpus](../../../../experience-studies/decisions/gm01-custom-intent-policy-v1.md) | [GM01](../../../../../../changes/archive/2026-11/experience/2026-11-13--gm-custom-intent-proposal/CHANGE.md) → [GM02](../../../../../../changes/archive/2026-11/experience/2026-11-13--gm-custom-intent-admission/CHANGE.md) | Recommendation: first zero-model-cost **inspect** family; GM02 must wait for real source-bound GM01 candidate and selected public-target fixture |
| **GM03:** standing routine | [Three-interval quiet watch](../../../../../open/time-and-autonomy/gm03-bounded-routine-v1.md) | [GM03](../../../../../../changes/open/2026-11-13--gm-standing-life/CHANGE.md) | **Conditional experiment**: compare existing accepted 3-step itinerary. If equal player value, **cancel new GM03 code** |
| **GM06:** viewer open checkpoint | [Foreground visit baseline](../../../../experience-studies/decisions/gm06-viewer-open-baseline-v1.md) | [GM06](../../../../../../changes/archive/2026-11/experience/2026-11-13--gm-viewer-read-position/CHANGE.md) | GM05 source sequence Done. Select shared per-viewer cross-device opening checkpoint. Zero SSR/prefetch/hidden-tab ACK; no "read everything" claim |
| **GM07:** delegated fallback | [One published-decision opt-in](../../../../../open/time-and-autonomy/gm07-consented-default-v1.md) | [GM07](../../../../../../changes/open/2026-11-13--gm-delegated-decision/CHANGE.md) | Recommend consent for **one** harmless decline after 20 real minutes, not global autonomy. Recheck currently **unimplemented campaign decision-deadline** path before Ready |

**Status semantics:** These are **design-complete recommendations**, not owner-accepted policies or implementation-ready source tasks. All linked Changes stay **Proposed**, with no current Change selection and no code/test/migration/provider approval inferred from a Markdown commit. A Cursor-first-screen brief can describe exact source/tests but cannot substitute for the explicit go.

## Immediate practical choices, ordered for code risk and player value

1. **C1-R first (correctness):** small enough to verify separately, but do not shoehorn operator rearm into a player endpoint. If audit/permission needs larger Admin architecture, ship the safe `canRetry=false` read safeguard in a separately approved narrower subpacket and keep operator rearm blocked.
2. **GM04 next (agency quality):** smallest human-observable gameplay fix; one stateful fixture and deterministic tests. It is higher direct player value than a third month of invisible refactors.
3. **GM06 next (credible return):** GM05's sequence is implemented; choose honest foreground open semantics and source-backed digest. May be independent of C2 after identity review.
4. **C2 after C1 recovery review and lock repro:** purpose is more complex, yet it prevents real under-lock external reads; avoid mistaking proof from pending/C1 for proof of C2.
5. **GM01 then GM02:** deliberate template-first experiment, one supported action family, not an unrestricted parser.
6. **GM03 and GM07 only after experiments / publication authority:** both could be deferred or cancelled if they add more infrastructure than worthwhile game experience.

This is a prioritization recommendation, **not** an instruction to Cursor to run these packets. A quick inexpensive GM04 could precede C1-R if operator privileges/audit integration blocks rearm; do not conflate urgency of an unfixed bug with permission to bypass security.

## Remaining design debt, intentionally not packed into this wave

| Area | Next **design** unit, not an instruction to implement |
| --- | --- |
| **ENG03 priority 3** | Distinguish activity segment consequence from controlling world obligation; inspect exact `campaignConsequence.kind=activity/world-obligation` source, capture SQL DTO, off-lock CAS, short publication; select **one** first |
| **ENG03 priority 4** | Historical report hook: capture event/reference chronology without replacing player current scene; build its own source, freshness and publication contract |
| **ENG03 priority 5** | Choice-continuation capture: separate stale selected offer/decision permission from consequence receipt |
| **ENG03 priority 6** | Opening/draft lock: **measure before redesigning**, original content locks/Start review have different authority, no copy-paste C1 migration |
| **SA07 / SA12** | SA07 only if labelled oracle failure actually appears; SA12 paid gates require **specific dollar cap** and owner spending authorization |
| **Admin wave 2** | Product-accept only **one or two** of invites/privilege, purpose-bound narrative access, billing/refunds, LiveOps, Trust/Growth, AI investigator before technical Change design. Avoid mass-generating AD09–AD20 |
| **Architecture portfolio targets** | Separate future desired-state → audit → Changes passes for Nest boundaries, persistence/model/migration consistency, production Temporal/multi-replica, security/quality/observability, billing/auth/entitlements and visual art direction. Do not turn today's maintenance list into a mega-Change |
| **Human playtesting** | Current scripted fixtures prove authority in narrow cases. They do **not** prove a compelling freeform life or paid model continuity. Run explicit tiny budgeted human gates only when product/engineering owners approve |

**Known signal from source:** the current C1 pending/committed same-G infrastructure is real; C2's interruption currently carries an event but no successful receipt; Gary's `calm-gary` failure really leaves state unchanged; Seyda Neen warehouse shift has **limited one-time occurrence and payout** and is ineligible as GM03 repeat; GM05 has a real public-event sequence but no GM06 acknowledgment. These are stronger facts than treating every unimplemented product direction as equal backlog priority.

## Cursor handoff when owner selects

Read **only** selected Change first → that contract's exact section → named source path and nearest README → 2–5 relevant actual code symbols → preflight and negative proofs. Before changing source, confirm latest main/branch and whether another change is active. A Change may become **Ready** only with specific owner code authorization and stop conditions satisfied. Every executed Change must return diff, focused test commands/outputs and negative evidence. No provider calls, destructive DB work, paid evaluation, deployment or changes to the product policy are authorized by this docs-only review.

## Recorded differences between recommendation and owner decision

The owner asked ChatGPT to **design and plan**, not write code, and gave discretion to work through the pipeline. The policy choices above are **advisor recommendations** for concrete first slices. The owner has **not yet separately accepted** their exact fixture/cost/permission settings or ordered Cursor to implement them. Explicitly preserve that distinction in Change state and PR description.
