# Player 360 service blueprint | relationships, evidence, and safe actions

**Status:** Proposed product deep dive, 2026-11-14; owner review required. **Owns:** operator-facing Player 360 layout, relationship vocabulary, mixed solo/shared-campaign journeys, visibility and freshness rules. It refines [Player 360 and entities](player-360-and-entities.md), without specifying a schema, billing arrangement, or frontend route. The [game vision](../vision.md) explicitly includes shared campaigns with individually controlled characters.

## 1. Crucial correction: one account does not mean one story owner

We must not design the future console around a one-to-one "user owns campaign and pays for it" assumption. There can be solo stories, invited participants, independent characters in the same campaign, and eventually larger shared worlds. Payment and usage responsibility may also differ from story participation; that policy has not been settled.

### Distinct product subjects

| Subject | Operational meaning | Not automatically identical to |
| --- | --- | --- |
| Staff identity | Privileged employee operating the console | Player identity, even if the same human is both |
| Player account | Authenticated participant and their personal product/account state | Paying entity, campaign owner, character |
| Campaign/story | Persistent shared or solo fictional continuity and gameplay authority | A single participant's private profile |
| Campaign membership / participation | A person's scoped relationship and possible character-control authority within a campaign | Campaign ownership, billing authority |
| Character / controlled perspective | Fictional subject a participant may control within the game rules | Human account identity |
| Commercial customer/payer | Contractual or payment relationship responsible for a product offering | Every participant in a shared campaign |
| Entitlement beneficiary | Account or permitted usage context receiving access | Whomever paid for that access |
| Grant/allowance source | Sponsored, promotional, paid, compensatory or another authorized origin of usage | Fictional currency or actual provider invoice |
| Published/shared versus participant-private content | Material available to all relevant players versus material with restricted audience | Every other member's private notes or interactions |

These are **conceptual distinctions**, not a promise that all relationships will exist in the first playable version. We should support them in product reasoning now so the Admin does not have to be reinvented when multiplayer arrives.

### Questions the operator must be able to answer

- Who is this account, and in which campaigns does it participate?
- Is this person an owner, invited member, observer, administrator of the campaign, or another supported role? **Do not invent these game roles before the gameplay product defines them.**
- Which character or perspective is associated with the person?
- Which participants will be affected if we restrict or repair this campaign?
- What access is the person entitled to **now**, and why?
- Who funded the relevant ability to play, and who bears the usage cost, if known?
- Which story facts are already shared among participants, and which records are private to another participant?
- When sources disagree, which states are verified, pending, stale, or unknowable?

## 2. Suggested Player 360 information structure

A unified account context is a navigation and investigation tool, **not** an unrestricted dump of internal data.

| Surface | Default useful answer | Drilldown / action | Privacy and evidence boundary |
| --- | --- | --- | --- |
| Header/identity | Stable account reference, verified account state, relevant creation/source info | Authorized identity details, recovery | Protected contact data separately gated |
| Access explanation | Effective feature access, limits, expiry and active restrictions | Why accessible/blocked; request narrowly scoped remedy | Never infer access solely from subscription |
| Library and memberships | Solo and shared campaigns, membership state, own characters and return state | Open campaign/participation record | Must not expose others' private narrative |
| Gameplay health | Published/latest known position, pending work, failed operations and incidents | Open committed state or execution diagnostics | Display claimed vs actually committed truth |
| Commercial relationship | Plan or sponsorship status, allowance source, consumption and exceptions | Subscription, usage, grant or adjustment record | Payer may be separate from beneficiary |
| Support | Active cases, assigned responder, relevant prior remedies | Open/create case, link evidence | Trust-confidential notes may be separately permissioned |
| Administrative history | Bounded list of notable interventions with status | Open action, approval and audit details | Sensitive-read history has its own access rules |
| Trust/privacy | Only permitted account-level restrictions and request state | Restricted specialist workspace | Do not reveal hidden allegations in routine support |

A read-only Support view should remain coherent with only summary and operational metadata. Blank forbidden panels should not imply that other private records do or do not exist.

### Layout and interaction rules

- The header identifies **which subject** is open: account, campaign, commercial customer, or participant record. Never silently substitute one identity for another.
- Open related records with context preserved: "from Case C to Campaign X to execution Y", and allow return to the case.
- Show the **source and freshness** of commercial state, game progress and provider status. Unknown is different from zero or none.
- Provide compact "reason for this state" explanations before demanding that Support interpret technical logs.
- Show permitted contextual actions close to the relevant subject, with appropriate scope and impact preview.
- Deep links are references, not access tokens; a receiving employee sees only records/fields they are authorized to inspect.
- A saved view or search result must not leak protected story titles, excerpts, participant membership, billing names or even record existence when not authorized.

## 3. Effective access: never a single Premium badge

At least four independent questions are needed:
1. **Commercial status:** is there a paid/sponsored relationship or other grant?
2. **Entitlement:** is the specific gameplay capability available to this beneficiary?
3. **Allowance:** is there enough verified remaining or reservable use for the operation?
4. **Operational eligibility:** is the account/campaign/platform permitted to perform the operation now, or held by a restriction, failed synchronization, budget stop or incident?

The console should explain: **what the player can do now**, *why*, *which source makes that claim*, and *what remains unknown*.

Example: paid subscription active; entitlement synchronization pending; allowance known positive; global provider spending paused. The summary must not become a confident "Premium works" badge or imply that the player may run a paid generation.

A grant can benefit one player, a particular campaign, or another target if future business policy allows it. The Admin must explicitly describe the **beneficiary and payer/funding source**, not invent a global interpretation.

## 4. Campaign perspective in a shared world

Open a campaign from a player profile and preserve the selected participation context. A support agent investigating Alice should know whether the relevant story belongs to Alice alone or also affects Bob and Carol.

For a multi-participant campaign the record should, subject to authorization:
- distinguish shared, committed campaign state from each member's participation/controlled character;
- show active member status and the consequences of revoked or expired membership;
- distinguish published narration available to the relevant participants from each person's restricted content;
- show whether an incident, repair, restriction or release affects one participant, a character, or the shared world;
- present **blast radius and disclosure** before any intervention in shared continuity;
- allow direct handoff to the shared campaign investigation without granting unrelated access to every member's account.

**A support permission over Alice does not automatically authorize broad access to Bob's account, payment relationship or private materials.** Shared-world facts that Bob and Alice can both legitimately see are different from Bob's personal/private account data.

A shared campaign repair may require additional review or participant notice. The owner must establish the exact policy; the interface must never treat shared state as a private note that can be silently edited for one person.

## 5. Evidence and historical timeline

The 360 timeline should show typed, source-linked events rather than one undifferentiated list:

| Event class | Example | Key distinction |
| --- | --- | --- |
| Player participation | Joined or left a campaign | Membership change, not payment change |
| Game operation | Chose an action, committed consequence | Accepted/settled/failed distinct from model prose |
| Published story | Passage became visible in game history | Narration publication is not automatic state authority |
| Commercial | Grant issued, entitlement expired, usage reserved/settled | Commercial fact distinct from fictional resources |
| Support | Case opened, escalated, resolved | Employee note is not automatically player-visible |
| Administrative intervention | Staff requested/approved/executed a repair or restriction | Proposed, approved and verified outcome distinct |
| Trust/privacy | Request or enforcement state | Restricted audience, not universal customer context |
| System/incident | Provider error, rollout, outage | Source, coverage and freshness shown |

An event's identifier, actor, origin, timestamp, revision/provenance, sensitivity and known status should be recoverable through its owning record. The interface does not claim it has evidence that was deleted or never captured.

## 6. Three detailed Player 360 journeys

### P360-J1: ordinary free solo player reports missing turns

- Support finds the correct account using a stable reference and opens a minimal summary.
- Access explanation shows free offering, relevant allowance window, consumption and last known operation.
- The operator follows a charged-operation receipt or current campaign state **without reading the whole story**.
- If an eligible compensation remedy exists, Support sees exact quantity, target, expiry and expected effective access; verifies its result after acting.
- **Negative:** uncertain paid dispatch is not silently charged twice, and "no event returned" does not mean the user has no history.

### P360-J2: Alice reports a contradiction in a campaign shared with Bob

- Support locates Alice and the participation record, then opens the specific shared campaign.
- The interface explains which world facts and published events are shared and which personal information belongs to Bob.
- Engineering can follow the committed event -> state revision -> storyteller execution without automatically reading both players' private texts.
- Any proposed correction displays **both affected participants** where relevant, existing commitments, and whether the action alters common continuity.
- **Negative:** an Alice-scoped operator cannot open Bob's private account by clicking "related participant." A sandbox reproduction does not mutate either player's live state.

### P360-J3: payer, beneficiary and campaign participant differ

- The console does not assume a subscription purchased by account A authorizes every action by account B.
- Where a supported commercial policy explicitly funds B or a shared campaign, the interface shows that relationship and its limitations.
- Support can explain eligible usage and missing access without exposing payer payment instruments or unrelated identity records.
- **Negative:** a grant aimed at one beneficiary cannot be casually reassigned through a support case or simply by entering player-preview mode.

The third journey is a **design stress test**, not an approved family plan, gifting feature, or settled multiplayer billing model.

## 7. Intervention from Player 360

Each contextual action needs an operator-facing preflight:
- **Target**: player, participation/character, campaign/shared world, commercial customer, grant or case?
- **Intent**: what is being requested or corrected?
- **Scope**: single record, all campaign participants, one operation, or broader population?
- **Authority**: permitted now, requires approval, or prohibited?
- **Impact**: player access, gameplay commitments, other people, financial charges, notification, reversible versus compensating remedy?
- **Outcome**: authoritative success, partial success, pending external settlement, or unknown requiring reconciliation?

No one-click free-form database edits from the 360 page. A player-view mode is not an alternative admin mutation mechanism.

## 8. Known hard edges

- Existing story and account terminology may differ in the code. Product concepts here do not claim an implemented entity schema.
- Shared player visibility, invited members, campaign transfer and commercial funding authority must be defined by the gameplay/commercial product before exact staff mutations are allowed.
- A story fork is a new independent line of play, **not** the same operation as undoing a bad narrative event in an existing shared game.
- Membership revocation during an investigation must immediately change what can be viewed or done, including previously opened links.
- Provider synchronization, cached projections and deletion/retention may make some facts stale or unavailable. The operator should see that limitation.
- Large shared worlds should not require the entire participant list or history to load just to answer one support question.

## 9. Owner decisions still open

- AD-P02: solo/shared membership, campaign ownership and payment beneficiary rules.
- AD-P05: which narrative and participant-private data staff may read, under what purpose/consent.
- AD-P07: allowed repair interventions and impact/notice in shared worlds.
- AD-P09: entitlement, allowance and payer/sponsor semantics.
- AD-P13: when affected participants should be notified.

Until these are resolved, Player 360 is a proposed product contract, not a build-ready source model.
