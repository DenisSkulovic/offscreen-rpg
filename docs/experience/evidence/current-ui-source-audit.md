# Current player UI | source-grounded product-gap audit

**Evidence class:** code inspection, not a browser usability test. **Inspected:** GitHub main at `3be49cc2c571dcd86585c56106905a87c789a19e`, 2026-11-13; source lines given below refer to that revision and may move. **Design authority:** [experience thesis](../foundations/experience-thesis.md), [Now](../spaces/now.md), [time/agency](../patterns/interaction-grammar.md). **Policy:** do not preserve existing flows solely because they are implemented. Do not change application code in this audit.

## Overall diagnosis

The present UI exposes a considerable amount of **implementation ontology** (time spans, process revisions, facts, settings revisions, private operation details) as if it were the player's mental model. This is not merely an ugly palette or poorly spaced fields. It is a **structural inversion**: technical subsystems determine the surface, and the player's experience is forced to navigate them.

A visually polished version of the same structure would still fail. The destination should be generated from player tasks: **perceive situation, choose intention, understand genuine time/risk, leave, return, and inspect continuity**.

The source supports specific observations below. Whether they feel ugly, confusing, or perform poorly is an **inference requiring rendered/human evidence**, not claimed from JSX alone.

## Observed source symptoms and design disposition

| Present source (Nov 13 main) | Observation, not inference | Why it risks violating the game experience | Destination / action |
| --- | --- | --- | --- |
| `apps/web/src/features/play/view.tsx:192–199` | Story header shows Storyteller name and world time **or revision number** | Database revision is a poor substitute for in-world context | Situation header with only genuine human context; revision belongs in developer diagnostics |
| `view.tsx:199–204` | Story renders main prose and title, which is sound | The prose is surrounded by several other independent feature panels, reducing the focus hierarchy | Keep passage semantics and server source, **replace page composition** |
| `view.tsx:211–243` | Journey status is a separate labeled notice, with `remainingMs`, `dueAt` and `gameDurationMs` in raw-ish copy | Mechanics explain themselves rather than feeling like a situated action | One commitment state in **Now**, with known real wait vs fictional duration and clear pause |
| `view.tsx:253–293` | Choice cards appear for stories without a mechanical character; a different path renders `CampaignPlay` | Same player intention concept is split according to implementation mode, which can create inconsistent UX | One **semantic intention grammar** over varied source contracts; preserve backend distinctions underneath |
| `view.tsx:327–363` | Sidebar contains History, Settings and Technical details, including USD usage, story ID, revision and passage ID | Frequent reading/choosing competes with settings and debugging data | Journal is separate; Settings are reachable but secondary; IDs hidden in diagnostics |
| `ui/campaign-offer.tsx:31–109` | Options include description, timing and risk; each actionable option also offers **Add as a later activity** | A dramatic dialogue becomes a scheduling interface; two buttons per option obscure primary intent | Choice is a clean primary attempt; planning is a separate intentional workflow |
| `ui/campaign-offer.tsx:111–139` | Plan staging asks for **Successor horizon in fictional seconds** plus Remove/Clear buttons | This is a concrete engineering unit and mental model, not narrative agency | Natural-language bounded plan, humane duration/time labels, consequences reviewed before acceptance |
| `ui/campaign-activity.tsx:90–110` | Status includes `earned/required`, state string, number of **mechanical boundaries settled**, dueAt and conditional completion estimate | Correct underlying state mixed with irrelevant technical counters | Promote earned progress; hide boundary count unless player opens mechanics; ETA only where reliable |
| `ui/campaign-activity.tsx:134–170` | Speed selector and two Apply buttons live directly in activity context | Routine gameplay becomes settings administration | Pace usually belongs to story settings; context exposes only affected ETA and permitted change control |
| `ui/campaign-activity.tsx:177–232` | Work you can return to, **Accepted activity plan**, fiction-second horizons, queue states, Cancel pending | Queue cursor/process detail dominates an inhabitant's question “What am I doing?” | Treat accepted plan as finite itinerary with readable stop conditions; inspectable schedule only when requested |
| `ui/campaign-status.tsx:12–19` | Always prints character name and `HP current/max`, plus world time | Humanoid/HP framing may be irrelevant to worlds without combat/body; blank values may leak | Contextual self/conditions only where defined and pertinent |
| `ui/campaign-status.tsx:26–35,64–85` | Current world conditions list, raw `fact.id:value`, story facts, SRD subset explanation | Fiction appears as state variables; risks secret/opaque info and weak comprehension | Translate **only authorized known** facts to contextual World/You; technical ledger is separate |
| `ui/campaign-records.tsx:62–97` | Expandable roll detail exists, with rules attribution | This is a promising primitive for trust but could be too prominent if expanded by default | Keep source/provenance; compact saved-roll display associated with actual result |
| `src/features/stories/draft-editor.tsx:197–397` | Creation already has foundation/role/storyteller/review steps and explicit save | Strong starting boundary exists. Still contains multiple form inputs, prepared-path constraints, profile selection needing human evaluation | Redesign experience around imagination/preview, **preserve reliable RHF/revision/Start contract** |
| `app/demo/story-demo.tsx:33–79` | Browser-only scripted demo with pause/advance/history controls | Controls may feel like a test harness rather than an immersive demo; code is not server persistence proof | New public demo storyboard, intentionally simulated and labeled; do not falsely claim live server |

## Root causes inferred from the pattern

### A. Backend nouns have become player nouns

“Mechanical boundaries settled,” “fictional seconds,” “revision,” “accepted activity plan” are valid internal diagnostic vocabulary. A coherent player might instead ask: **Am I still repairing? Did I get any closer? Can I leave? What happens if someone interrupts me?** 

**Design response:** separate semantics from implementation and write a [player-language lexicon](../system/interaction-copy.md) before redrawing components.

### B. Multiple subsystems compete for simultaneous attention

The side-by-side history/settings/technical detail layout is a powerful way to build a developer workbench and a poor default for narrative presence. There is no evidence that a new player wants to adjust pace and read model billing beside a stranger's dialogue.

**Design response:** Now for presence; Journal for history; Story Settings for knobs; a small optional contextual shelf for facts truly relevant to the current decision.

### C. Authoring an *intention* is confounded with scheduling *future work*

The UI attaches queue-planning controls to individual action choices. That creates a risk of treating every contextual action as a building block in a scheduler. Most players should choose to talk, watch, work or leave; a bounded unattended plan is a separate higher-level consent.

**Design response:** distinguish **explore**, **attempt**, **commit**, and **delegate for absence**. The last one gets a plain-language preview, not a field in fictional seconds.

### D. The UI has multiple pathways for similar experiential meaning

The `current.interaction` versus `campaign.offer` split is legitimate backend history, but the player still experiences "here is a meaningful intention." We should not force two unrelated visual grammars because one scenario has a mechanical character and another is a legacy narrative rehearsal.

**Design response:** a semantic display model may unify *presentation* while preserving different admitted command shapes and authority. No browser-side workaround to the engine.

### E. Existing good work is real but not a UX strategy

The current React stack protects lost ACKs, stale views, drafts and request identity. Some controls already show factual progress and author-admitted risk. **Keep these underlying safeguards.** The problem is that the current product surface uses those safeguards as its information architecture.

## Design priority, independent of implementation ease

| Severity | Problem | Why first? | Target owner |
| --- | --- | --- | --- |
| **P0** | Don't know whether my action happened / work progressed | Fundamental trust; false progress breaks unique promise | [State semantics](../patterns/state-and-attention.md) and [time truth](../patterns/time-and-truth.md) |
| **P0** | Current scene competes with mechanics/settings/queue | Main experience feels like admin | [Now](../spaces/now.md) and [UX01/02](../implementation-program.md) |
| **P0** | “Add as later activity” attached to every offered action | Agency reads as task scheduling | [Choice grammar](../patterns/interaction-grammar.md) and [absence](../patterns/autonomy-and-absence.md) |
| **P1** | Raw numbers/fact IDs exposed | Conception of world is internal records | [World/You](../spaces/journal-world-you.md) |
| **P1** | Unclear if “resume” is same durable work | Effort may feel reset | [Commitment](../patterns/time-and-truth.md) |
| **P1** | Technical story state as entry UI | Bad new-player mental model | [Stories library](../spaces/stories-library.md) |
| **P2** | Animation/theme/illustrations not distinctive | Portfolio first impression | [Motion](../system/motion.md) after P0/P1 |

## What source inspection cannot tell us

- Actual layout at 375/768/1440 pixels, contrast, hierarchy and scroll length.
- Whether current journey and plan controls are comprehensible to anyone unfamiliar with the code.
- Whether server outputs match the complex JSX paths on actual settled/blocked data.
- Whether current prose quality / Storyteller behavior makes the story worth continuing.
- How fast real recovery, navigation and editing feel on a typical computer/phone.

**Required next evidence:** controlled screenshots at five canonical states, video of J2–J5, and unprompted user comprehension. Do not cite this source audit as a usability study.

## Current baseline movement

Main advanced from `8c91618` to `3be49cc` before this audit. The intervening commits modify Play route prefetch, story reads/SSE and integration tests, **not the observed Play JSX listed above** (per GitHub compare). The design branch remains separate. Cursor must re-check source at the moment a proposed Change becomes Ready; line numbers are not API contracts.
