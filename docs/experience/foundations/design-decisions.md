# Design decisions | alternatives, bets, reversals

**Status:** recommended UX architecture, owner review pending. This is a decision record for *experience*, not an implicit change to gameplay contracts.

## D01. Choose the scene-first stage over the three tempting alternatives

| Candidate | Strength | Why it loses as the primary paradigm | Where to keep it |
| --- | --- | --- | --- |
| **Chat-first** (LLM transcript) | Familiar free text, sequential exchange | World and character flatten into a conversation; timing, ongoing work and return are hidden | Free-intent composer and dialogue passages within a scene |
| **Management dashboard** (cards, metrics, controls) | Easy to implement and inspect | Centers system state rather than lived experience; feels like a SaaS control panel | Development Chamber and optional advanced inspector |
| **Journal-first** (book/chapter flow) | Beautiful reading and long history | Weak for concurrent offscreen commitments and present choices; invites fake chapters | The dedicated Journal surface |
| **Scene-first stage + contextual shelf** | Present situation, narrative, contextual agency; secondary system state on demand | Requires thoughtful transitions between reading, waiting and re-entry | **SELECTED design direction** |

We should reverse D01 only if actual user research shows frequent multi-character supervision as the dominant core task. That would be a *different product*, not a reason to put six dashboards beside the prose.

## D02. A compact common shell, not a screen for every backend entity

Top-level player spaces: **Stories / Now / Journal / World / You / Settings**. “Now” is home inside a story. World and You are **conditional**: do not render empty inventory/character systems for a microbe or abstract entity. The story title and current situation stay legible at the top. Creation is a flow, not a permanent administration tab.

Developer Chamber never shares player navigation hierarchy or privileged controls.

## D03. Do not equate a generated option with the full scope of player agency

**Problem:** the present POC exposes authored options and does not support free-text gameplay; this is a valid near-term engineering boundary but a poor permanent ceiling for a game sold as an AI dungeon master who accommodates imagination.

**Destination:** a hybrid model. Author-curated, **specific, contextually valid intentions** are always the safe, low-friction primary affordance. A secondary **“Try something else”** entry permits authored intention when supported. It must preview/validate the interpretation and time/risk/cost before the action becomes authoritative. The player never writes an effect, dice outcome or guaranteed canon.

**Why not free chat everywhere?** Players expect natural language to work, but an arbitrary prompt may be impossible, costly, out-of-world, dangerous in-game, or impossible to adjudicate mechanically. A “send message” box that quietly lets the LLM rewrite reality would sabotage earned consequence. Free-form input therefore needs a *separate, bounded engine design*, not an innocent textarea Change.

**Product/engine conflict flagged:** current `docs/player-experience.md` and `docs/gameplay.md` explicitly limit POC to offered options. Preserve that for shipped behavior until an approved contract change. The destination is a **future proposal**, not a claim that it works now.

## D04. Time must be felt, but never faked

An accepted task shows *what is running*, *what progress is committed*, *conditional real-time expectation*, and *what may interrupt*. The game clock advances only by authorized accepted actions. A static scene cannot display a “world alive” counter merely because it is open.

For public portfolio purposes, provide a **distinct scripted demonstrator** with explicitly simulated time. Do not accelerate a real six-hour work process invisibly to make a recruiter smile. In real stories, preserve chosen game rules/pace and reveal what they mean before commitment.

## D05. Treat returning as a first-class story event

A returning player who missed activity sees a **small factual “Since you left” recap** anchored to settled events; optional expressive narration remains separate and budgeted. It should lead to the present decision, not replay the entire log. A visit with zero world changes says so rather than inventing interest.

Avoid a universal “event feed” that equates a minor tick with an arrival, lost object or changed friendship.

## D06. Contextual disclosure, not system-feature omnipresence

Visible by default: current location/situation when applicable, state of progression, decision, known costs and time. Accessible on request: rolls, item details, relationships, whole journal, change provenance, exact scheduling and usage breakdown.

Do not cram “risk,” “HP,” “cooldown,” “inventory,” “active plan,” “world clock,” “energy” and “AI model” into six always-visible cards. If one is critical to the current decision, **promote that one** into the action context.

## D07. Choice surfaces are not decoration

Meaningful options are verb-led, differentiated, and preview known stakes. A passive option exists only when meaningful. Menu navigation never spends fictional time; a committed “observe for one hour” does. “Continue” should not be a compulsory paid narrator turn between previously authorized legs.

Inline actions are allowed inside a passage only when focus order and consequence are clear; for most scenes a single grouped action area after the current relevant passage is safer.

## D08. Design quiet and busy moments with equal care

Tense story: scene content and immediate options dominate. Quiet life: prepared local opportunities and sustained commitments dominate. An interruption moves focus to a developed scene; after its resolution, any prior valid commitment resumes only under rules. There is no compulsory scene/activity toggle or mandatory narrative escalation schedule.

## D09. Use purposeful craft, not an RPG-themed dashboard skin

Typography and spacing carry literary intimacy. Subtle animation clarifies an admitted operation or a new passage; it must not simulate random events. Atmospheric art is optional and never the only source of information. Theme belongs to content, not core mechanics.

## D10. Explicitly separate demo, POC, target and experiment

Every piece of documentation or UI specimen needs a level tag:
- **Existing / observed**: supported by current API and independent tests or inspected browser behavior.
- **Design target**: chosen UX behavior to build, subject to source/rules feasibility.
- **Future contract**: requires new mechanics or public projection.
- **Experiment**: uncertain solution to evaluate with people.

Do not label a linked Storybook state “live feature” or a reset-on-refresh demo “persistent gameplay.”

## Decisions requiring a later, explicit product and technical resolution

| Issue | Recommendation | Why not solved in CSS |
| --- | --- | --- |
| Bounded custom intentions | Hybrid offers + validated natural-language proposals | New input, interpretation, cost, safety, authority and rejection contracts |
| Interrupting a commitment to change course | Dedicated “Change course” flow showing preserved progress / consequences | Activity suspension, revalidation, capacity and irreversible effects |
| Detailed “since away” recap | Source-linked event projection, not unconstrained LLM summary | Durable event semantics and provenance |
| Re-entry autonomy/response deadlines | Explicit selectable policies and plain-language consent | Character agency, pause, owner permissions, real-time deadlines |
| Nonhuman contextual sheets | Adaptive inspector based on actual capabilities | Data projection of relevant entities and actions; no universal character shape |
| Opening generation | Recovery and provenance separate from admission/start | Async and billing semantics |
| Public playable proof | Original, licensed or owned story demo; honest simulation labels | Hosting, IP, costs, auth and provider reliability |

## Review discipline

A future proposal should name **what would disprove this choice**. Example: if first-time testers cannot tell “Try something else” from guaranteed free authoring, change the wording and admission flow. If the contextual shelf hides crucial risk, promote *that* risk. If quiet scenes feel empty, test layout/atmosphere before manufacturing arbitrary encounters. A design survives by evidence, not by how confidently a model described it.
