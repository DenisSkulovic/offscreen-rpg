# Prototype storyboard | the harbor beacon becomes a living moment

**Status:** UX DESIGN FIXTURE, not a browser run, not implemented behavior. This storyboard draws its **rules and event order** from the maintained [Gold session H0–H4](../../technical/playthroughs/harbor-session.md). Screen labels, typography and text arrangements are **proposed UI**. This is the first experience to prototype before broad design-system polishing.

## Why this scenario is strategically useful

It exercises nearly every reason this is **not** a generic chatbot:
1. The player can choose a life activity without a new model call per click.
2. Progress is earned through actual checks, not promised by a button.
3. A complication interrupts that effort while preserving it.
4. Several rapid dramatic exchanges happen without presenting an unrelated routine menu.
5. The Storyteller later explicitly reauthorizes prior work; the same durable work can resume.
6. A different small task can be done first, then the same repair continued.
7. Re-entry reads committed facts rather than synthesizing a convenient new narrative.

**Don't base the UI on an idealized straight-line success story**. This test has a failed check, a hold, an intervention, source history and a quiet return.

### Canonical fixture bounds to respect

Gold session H0: beacon repair **A** requires 9 contribution points, cadence 5 eligible ticks, can earn +3 on successful check, +0 otherwise. Securing tools **B** requires 3 points and finishes in one successful cadence. Wait **W** is a separate ten-tick literal waiting action with no reward. For the demo fixture, one tick per real second, but it is **not labeled a fictional minute**. At tick 5 A is 3/9; at tick 10 the check fails and the stranger arrives, interrupting A. No reward. Three rapid decisions at tick 10 establish authority/clearance. B completes at tick 15, A then resumes and finishes at tick 25; reward is applied **once** on A's completion. The reference is a **target trace**, not a proven live-model run.

## Screen 0 | the quiet opening

**Entry condition:** H0 published and locally authorized opportunities A, B, W. No action or work currently active.

Visual hierarchy:

    GREYWAKE HARBOR              In-world: still at tick 0
    The Beacon Landing

    The signal beacon is dark. The exposed tools
    are still where the last keeper left them.

    The water below is quiet enough to hear the
    metal lens turn in the wind.

    WHAT WILL YOU DO?

    [Begin repairing the beacon]
      Earn repair contribution over several checks.
      Completion is uncertain.

    [Secure the loose tools]
      A smaller task, with its own admitted terms.

    [Watch the harbor]
      Wait for a defined interval. No repair progress.

    [Details]  [Journal]

**UX notes:** The repair is not an achievement disguised as a button. Option subtitles explain **different kinds of time**, not guarantee rewards. No job-board tiles, universal activity grid, or “Start game clock” switch. A **short fictional ambient paragraph** may improve atmosphere; it is not a canonical new NPC/object effect unless the fixture supplies it. Last-sentence descriptive prose is illustrative; do not copy it into canonical fixture data without Storyteller review.

**Forbidden:** “Repair 9/9 immediately,” “Get 4 credits” as an already granted reward, “I am working” before acceptance.

## Screen 1 | accept one long commitment

**Player selects:** Begin repairing the beacon.

A compact review can say:

    BEGIN REPAIR

    Goal: restore the signal mechanism.
    Work is checked at admitted intervals.
    Progress only comes from successful attempts.
    A new event may stop work before completion.

    This demo uses accelerated test time.
    Closing the tab is allowed in a persistent
    authenticated story with an accepted activity.

    [Begin repair]     [Back to the landing]

The confirmation is *conditional*: if ordinary low-risk repeatable tasks feel cumbersome, test directly committing on first click with the same known stakes displayed beside the option. A full-screen wizard for every repair is rejected.

Once admitted, the current visible earned contribution is **0/9**. The game can show the next boundary; it must not animate an increment merely because the command returned 202.

## Screen 2 | a character working, not a running worker

    REPAIRING THE BEACON

    3 of 9 repair units earned
    Last verified: first check succeeded.
    Next check: estimate based on admitted time
    Your character is still working.

    [Review progress] [Pause, if supported]

**Actual gold sequence:** at tick 5, check succeeds and earns 3; at tick 10, an attempt fails and earns 0. Fictional time has advanced, repair contribution remains **3/9**. The UI may group routine checks; a curious player can inspect the actual saved dice/receipt.

**Do not** show “50% complete” just because half the initial ten-tick window elapsed. A 3/9 fractional progress display is legitimate here because the defined target is 9 and 3 units were committed. Real completion time is not deterministically known from this fraction.

## Screen 3 | a stranger interrupts: a scene takes over

**Gold event:** occurrence draw at tick 10 establishes stranger present, work area not clear, repair held at 3/9.

    SOMEONE ON THE LANDING
    Decision waiting · repair interrupted

    Someone in a soaked harbor coat has climbed
    onto the landing. He stops short of the
    mechanism.

    “Is the light being repaired?”

    [Ask whom he represents]
    [Withdraw to the nearby shelter]

    ┌ CONTEXT ──────────────────────┐
    │ Beacon repair suspended       │
    │ 3/9 units retained            │
    │ No work continues while       │
    │ this decision is unresolved.  │
    └───────────────────────────────┘

**Crucial interaction design choice:** the primary content is now **the new scene**, not a repair dashboard with an interrupting notification toast. A small contextual memory of repair remains visible. There is no “Repair again” option, no routine sleep/fish/wait menu during H1, no unapproved auto-response and no hidden danger preview.

On mobile, the context becomes a small expandable line near the status rather than a second column.

## Screen 4 | rapid conversational presence

**Gold H2:** he claims the harbor watch sent him, but this does not prove truth.

    THE WATCH'S CLAIM

    He says he was sent by the harbor watch.
    Beneath the wet coat you can make out a badge.
    A claim is not proof.

    WHAT WILL YOU DO?
    [Study the badge from the doorway]
      An uncertain check.
    [Keep your distance and decline contact]

**Design point:** the player reads an actual *developing scene*, not a chat bubble from the DM followed by a user message bubble and another chatbot response. The previous passage is reachable in the Journal, but the latest meaningful passage is the center of attention.

**After choosing inspection:** the rules commit the appropriate check and fact effects. A short saved-roll detail can appear once the server reports the committed result. In this gold branch the check succeeds, making credibility established. On failure the attempted inspection fact still changes and the *same* shortcut cannot simply be spammed to reroll.

## Screen 5 | a third decision, still the same scene

**Gold H3:** badge credible; work still paused; new offered ways to clear the work area.

    A BADGE YOU RECOGNIZE

    The badge is genuine. He can pass the
    warning from the boat instead of standing
    beside the exposed mechanism.

    [Ask him to return to the boat]
    [Have him wait clear of the mechanism]

These options have genuinely different remembered facts; neither resumes repair automatically. After their resolution H4 can reauthorize repair and tools, depending on saved conditions. **A prepared routine button must never leak into the middle of H1–H3** because it happens to be mechanically eligible according to a separate raw inventory check.

## Screen 6 | return to quiet life without losing work

After clearing the work area, H4 explicitly admits A/B/W. The UI returns to a calm situation with one-line context:

    THE LANDING IS CLEAR

    The stranger has gone back to the boat.
    You still have a damaged beacon and loose tools.

    WHAT WILL YOU DO?
    [Continue repairing the beacon]
       Same repair · 3/9 earned
    [Secure the loose tools]
       Separate task
    [Watch the harbor]
       A genuine wait, no work progress

A returning player chooses **B**, secures tools (3/3) at tick 15, and then resumes **the very same A** at 3/9, not a new repair process. A earns 6/9 at tick 20 and 9/9 at tick 25. The completion reward is once, at final settlement.

**Emotional consequence:** the character's earlier effort feels real because it wasn't erased by drama, and the work's later completion feels earned.

## Screen 7 | return after browser absence

Suppose the player leaves after starting work and returns after the event hold. The browser reads authoritative state before presenting the scene.

If there is no trustworthy per-viewer read cursor, label this **Recent developments**, not “Since you left”:

    RECENT DEVELOPMENTS

    ✓ Your repair earned 3/9 units.
    ○ A later repair attempt made no progress.
    ! A visitor interrupted the work.

    Current situation:
    A man in a harbor coat asks a question.

    [Return to the decision] [Open Journal]

The right side of the screen (or mobile expandable contextual area) may show “Repair suspended · 3/9 preserved.” There is no exploding notification center, no false “While you slept your hero earned 4 credits,” and no secret event schedule spoiler.

If the player left at H4 with an admitted bounded plan continuing in background, the digest can show later completed B/A **only if recorded receipts really settled**.

## Screen 8 | recovery without a fake outcome

**Lost ACK after accepting a choice**: keep last verified passage visible, show “Checking whether this attempt was accepted,” freeze intent, retrieve durable operation state, never send new arbitrary game command from page reload.

**Model narration fails after rules settle**: show completed work/facts from receipt and a separate explanation that the Storyteller account is unavailable. No reroll or undo.

**Time estimate reaches zero**: show “Checking result” until committed state is known. An animation countdown doesn't own game state.

**Usage allowance blocks required narration**: identify that exact hold and current known world state; no “Your character is dead/frozen forever” fiction.

## Before Cursor renders this

- Distinguish **gold target trace** from existing implementation. It may require real fixture access, a mocked Storybook projection or separate engine changes for some states.
- Preserve current exact auth, operation identity, source and rules boundary.
- First make this single journey comprehensible with sparse, original styling; then evaluate art/sound and variable world skins.
- Record wide/narrow screenshots for Screens 0, 2, 3, 4, 6 and 7, including a reduced-motion pass.
- Have a stranger identify, without coaching, why the stranger arrival stopped work, why inspecting the badge isn't simply pressing ChatGPT, and why the 3 repair units survive.

**Acceptance:** if a person can say “I was fixing something; someone interrupted; I handled it; the same unfinished work was still there; eventually it finished,” the UX is getting closer to the dream. If they describe “I managed some jobs and clicked buttons,” it failed even if every backend test is green.