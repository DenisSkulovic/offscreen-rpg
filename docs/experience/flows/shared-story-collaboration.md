# Shared stories | one world, several real people

**Status: FUTURE product-experience architecture, not implementation permission.** The original [vision](../../vision.md) includes inviting friends into a shared story and a first small-party experience. The current solo engine is the demonstrated foundation; group time, decision ownership, presence and fallback require **new authoritative game contracts** before a multiplayer UI can honestly claim to work.

## Product promise

Two or three friends enter a **shared world**, each controlling their own character, and watch the consequences accumulate over time. They do not become an administrator and two spectators, nor does the app treat a party as one composite character with a “host controls everyone” shortcut.

**What it should feel like:** a group tabletop session that can proceed asynchronously within agreed limits, with real agency and preserved shared history.

## Why we cannot simply add invite buttons

A shared campaign introduces questions the solo UX cannot answer:
- Who owns a decision affecting a shared location or another character?
- Can one player begin a ten-hour journey if another player has not agreed to accompany them?
- Does a dialogue with an NPC hold the clock for everyone or just affected participants?
- What happens if one member disappears for a week?
- Who may pause the whole group, change pace or switch Storyteller?
- Can two participants commit incompatible actions at once?
- How are rolls, resources and location state settled consistently?
- How do notifications respect privacy without revealing another player's hidden viewpoint?

These are **game semantics**, not problems a React “Members” panel can solve.

## First-player journey, when mechanics exist

1. **Creator begins a shared premise**. A short invitation summary states expected tone, risk, pace and absence behavior. The creator cannot silently enable irreversible risk after friends accept.
2. **Invite players** through owner-approved private links/access. A share URL isn't permission for arbitrary outsiders to inspect the campaign.
3. **Each member establishes their own perspective** within the prepared foundation. The game explains fixed shared facts instead of asking incompatible answers.
4. **Readiness is explicit**. Participants can see who has joined and who still needs to confirm. Starting is a distinct operation, not a side effect of sending an invite.
5. **Enter shared Now** with a common current situation. Player-controlled choices are clearly attributed; the world is one shared truth.
6. **Group resolution** occurs according to a declared collaboration policy, not whichever browser clicked first in a UI race.
7. **Return after absence** shows a shared factual chronology and what your character contributed or has not yet decided.

No mandatory public matchmaking, global world lobby or voice chat for first group scope.

## Competing time/decision policies

| Model | Experience | Benefits | Serious costs |
| --- | --- | --- | --- |
| **Whole-party lockstep** | Group makes one shared decision, waits for all required participants | Strong shared coherence, easiest to explain | Slow player stalls everyone; presence burden |
| **Per-character proposals in a shared scene** (**preferred candidate**) | Each affected participant submits a bounded intention; server resolves one coherent bundle | Preserves individual ownership and tabletop feel | Requires conflict arbitration, revision and deadline policy |
| **Host-controlled party** | Creator picks collective actions | Fast and easy to code | Other players lose meaningful agency; contradicts original character ownership |
| **Independent simultaneous subworlds** | Each player has separate active scene/clock | Rich long-term flexibility | Very high consistency/context and orchestration cost |

**Recommendation:** research lockstep for the first narrow group proof, with **per-character intent ownership** even if the shared scene waits for a collective decision. The server may need to collect a batch of intentions and settle them together. Do not leap to full separate simultaneous adventuring to satisfy a portfolio screenshot.

## Shared Now visual grammar

\`\`\`text
THE OLD PASS
Shared story · 3 participants

The ruined bridge sways above the ravine.

Your perspective: Mara, the scout
Your next intention: [Inspect the bridge] [Propose a safer route]

Group decisions:
  You       Not yet submitted
  Companion A   Choosing
  Companion B   Ready

The story moves when the required choices
are resolved under this group's policy.
[Review group agreement]
\`\`\`

This is a conceptual **future state**. It must not expose an “Alice voted to betray you” preview if their intent is intended to be private. Published facts are shared only where the story's character/viewer visibility policy permits them.

**Not a generic multiplayer dashboard:** the scene and each player’s actual agency remain primary. Participant readiness is concise contextual status, not an always-visible project board.

## Deadline, silence and the absent friend

A group must choose its policy **before** a consequential window:
- **Wait for everyone:** a decision remains held until relevant members respond.
- **Bounded real response window:** participants know the deadline; after it, only an explicitly consented fallback may apply.
- **Safe character fallback:** limited to admitted policy and eligible current options (e.g., stand aside), never arbitrary combat/relationships/trades.
- **Temporary absence:** consented player sets their character's allowed behavior for a declared span.

A public UI cannot present "Continue without Anna" unless Anna already authorized the relevant absence/character-control policy. A “host” title alone does not confer moral or technical ownership of another person's character.

## Pause and pace

The solo Pause button cannot be copied into multiplayer:
- If the entire shared clock is held, one participant may affect everyone. Define whether host, unanimous approval or a bounded majority can request it.
- A local UI pause of alerts/reading doesn't necessarily stop shared time.
- Pace changes may alter real response deadlines; do not retroactively shorten a published window while someone is choosing.
- A participant rejoining after a long absence may see a read-only settled history; they cannot rerun already resolved group intentions.

**Initial recommendation:** in first lockstep proof, permit only a clearly declared **whole-party hold policy** whose authority all members accept before Start. More granular per-scene clocks come later.

## Current action ownership and concurrency

Every submitted intention is bound to **viewer identity, controlled character, current shared situation revision, and immutable operation ID**. The UI may display who is waiting only from authorized public status. Server authorization, not UI disablement, prevents Alice from submitting Bob's action.

A stale or incompatible new intention is rejected or brought back for review without secretly discarding another player's committed work. No “last write wins” treatment of the shared story.

## Re-entry and privacy

A player returning to shared Now should learn:
- verified shared changes since an appropriate baseline;
- their character's current situation and whether they can act;
- other participants' public presence/decision readiness, if permitted;
- which actions were autonomous within captured consent;
- whether any pending group decision has expired or already settled.

A private NPC conversation, hidden personal goal or unrevealed roll cannot leak merely because the shared Journal renders all stored passages. Viewer-specific privacy is part of multiplayer design, not a later frontend filtering task.

## What to prototype before a code Change

Create an offline two-player fixture:
1. Both agree to approach a bridge; one inspects while another prepares rope.
2. One player loses connection after submitting an intent.
3. Both try incompatible uses of the same item.
4. One returns after the group reached a decision boundary.
5. One participant asks to pause while the other wants to continue.
6. One tries to command the other's character via custom-text proposal.

Test that every person knows **whose choice is needed** and what will happen when they close the page. Only after this should an explicit shared-time rules dossier be selected. Avoid claiming first-party multiplayer is ready because a Players panel can list three avatars.

## Deferred

Public matchmaking, PvP, large persistent shared worlds, independent simultaneous scenes, live co-op cursors, voice/video and dynamically generated group settlements are future separate projects. The small common storyline is a much more honest first benchmark.
