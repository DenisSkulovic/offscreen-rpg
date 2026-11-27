# Phase 1 | End-to-end player journey blueprints

**Status:** OPEN DESIGN. These are **authored walkthrough fixtures**, not user research, existing story records or proof of implemented behavior.
**Intent:** design temporal, narrative and recovery continuity across screens. Later wireflows must be evaluated against these blueprints with concrete source-backed fixtures.

## Reading key

Each beat names (1) **player intention**, (2) **verified or explicitly simulated system truth**, (3) **experience response**, (4) **emotional aim**, and (5) **negative/error branch**. Emotional aims describe design intent, not a claim about actual players. The labels “Mara”, “beacon”, fictional minutes and story copy below are illustrative only; the game's canonical time and execution contract still applies.

## Journey A — A curious visitor becomes the owner of a life

**Situation:** A visitor arrives from a portfolio/CV link. They have little patience for model/provider jargon and do not know whether this is a real game or a scripted demo.

| Beat | Player intention | Truth / required source | Experience response | Emotional target | Error / honesty branch |
| --- | --- | --- | --- | --- | --- |
| A0: Arrival | “What is unusual here?” | Public product claim; no live account | A lived miniature situation with recognizable stakes and one invitation to try | Curiosity, not marketing fatigue | Demo is explicitly scripted, not disguised as autonomous life |
| A1: Trial | “Can I influence the situation?” | Authored demo state; manually advanced time | Present one clearly named intention and contextual tradeoff; selecting it leads to a demonstrated consequence | Understanding causality | Refresh resets demo; no fake save, no fictitious persisted timer |
| A2: Invitation | “Can I have my own?” | Authentication needed before durable generation spend | Obvious create-live-life route; explain what account makes persistent | Ownership | Auth failure preserves safe context but does not claim demo became saved |
| A3: Foundation | “What kind of life?” | Prepared bundle or custom premise, with visible constraints | Meaningful conceptual choice, not a world-DB form | Imagination | Do not show incompatible universe/role fields; save incomplete draft |
| A4: Role | “Who/what am I here?” | Compatible starting circumstances, form and known facts | Concrete role options with concise prose; nonhuman forms fully valid | Identification | Changing foundation marks incompatible later inputs stale |
| A5: Story direction | “What kind of Storyteller?” | Profile, initiative, pace, invention ceiling, risk/cost understanding | Simple settings first, advanced disclosure when wanted | Trust and creative agency | No generic “the AI will do anything”; restrictions and charges are visible |
| A6: Review | “I understand what will start” | Captured exact choices and generation policy | One legible summary; clearly distinguish generate opening from starting real-time life | Readiness | No model call from viewing review, no silent regen on navigation |
| A7: Generate | “Show me my first situation” | Generation/request status and receipt, explicit budget | Calm preparation state; preserve review details and recovery option | Anticipation | Failure, timeout, provider refusal and usage uncertainty produce distinct safe pathways |
| A8: Begin | “This is now mine” | Exact approved opening and explicitly accepted start | Land in Now with the original opening, active affordance/hold, identity and Journal location | Presence | Start must not retroactively change the approved opening |

**First-use stress case:** the generated opening is long and has no illustration, and the user is on a 375px phone with reduced motion. Can the user still recognize the world, the next choice and the difference between “Start” and “Prepare”? A spectacular hero image cannot be a prerequisite for comprehension.

**Gate test:** ask a participant to explain, in ordinary words, which part was scripted, what they just paid/consented to, whether a story has actually started, and what kind of outcomes the UI can guarantee.

## Journey B — Ordinary living, interruption, absence and return

**Illustrative story:** Mara maintains a distant signal beacon. The world admits a work interval that will take real elapsed time. During her work, an unplanned arrival may interrupt her. This example borrows the *kind* of situation described in `concepts.md`, but is not a live result.

| Beat | Player intention | Truth / required source | Experience response | Emotional target | Error / honesty branch |
| --- | --- | --- | --- | --- | --- |
| B0: Open | “Where am I?” | Current saved passage + authorized offer/status | Foreground prose, concise situation anchor, optional known-world context | Orientation | Stale query response cannot supersede newer viewVersion |
| B1: Consider | “Repair the beacon or investigate the noise?” | Offered choices and their authorized scopes; visible costs/risks | Distinct narrative actions with honest descriptions; inspect ≠ commit | Deliberation | Unsupported free text and fake options are absent |
| B2: Commit | “Work on the beacon” | Frozen intent envelope + server admission | Explicit transition from choice to admitted work; action controls stop looking available | Confidence | Lost 202 response does not automatically resend or reroll |
| B3: Carry on | “Can I leave?” | Real deadline/progress and pause controllability; no unapproved new choice | An intentionally quiet ongoing-state composition explaining accepted commitment and expected next check | Calm investment | Never award promised pay or completion on the strength of a countdown |
| B4: Interrupt | “Someone has arrived!” | Engine admitted interruption or world development; only published after commit | Updated situation and active decision; original earned progress remains intelligible | Surprise grounded in consequence | Do not animate an interrupt merely because a speculative timer elapsed |
| B5: Choose again | “Ask the stranger what happened” | Fresh offer with exactly-once accepted selection; old option invalid | New threshold grounded in the same ongoing *scene* if appropriate; no faux chapter break | Continuity | Stale previous button is disabled, refreshed or reconciled |
| B6: Leave | “I'll come back” | Accepted bounded execution (or no authorized progression) | Exit without guilt or fake ‘autoplay’; optional truthful expectation shown | Freedom | Closing tab does not authorize a new NPC response |
| B7: Reopen | “What actually changed?” | Foreground visit checkpoint plus committed event window with coverage | Short source-scoped prelude: current situation first, what changed second, click into detail if desired | Recognition and renewed momentum | Notification/prefetch ≠ seen; no fake “since your visit” if checkpoint missing |
| B8: Continue | “Now what?” | Current offer/hold and latest stable passage | Clear action path coexists with recap, then optional Journal exploration | Agency | Recap must not block a live choice or publish delayed history as current outcome |

**Two alternative B7 outcomes must be visually tested:**
- **Real progress occurred:** the interval settled and a passage was published. Recap shows verified development(s), their coverage and links to original passages. Never says “you earned X” before receipt.
- **Nothing new was committed:** the same undertaking remains active or paused. The return must feel honest and intentional, not invent an event to fill an empty digest.

**B7 failure variants:** generation is failed but mechanics have settled; provider usage is uncertain; browser is offline with cached last-known state; historical report was published later about earlier fictional time. All demand different headings/actions, not one “Oops, something went wrong.”

**Gate test:** can someone leave and return, accurately explain whether work finished, identify which decision is genuinely available, and find one source passage without believing the UI generated a new world event?

## Journey C — Six-month story, a remembered gift and 2,000 passages

**Illustrative story:** a player gave a modest object to a recurring acquaintance early in the story. Months later a detail recalls it. This tests ordinary-life significance without assuming a dramatic boss fight. The relevant person/object **must actually be recorded or quoted from published prose**; no fake relation graph.

| Beat | Player intention | Truth / required source | Experience response | Emotional target | Error / honesty branch |
| --- | --- | --- | --- | --- | --- |
| C0: Recognition | “That reminds me of something from early on” | Current passage's actual wording | Optional Journal invitation/anchor from Now | Curiosity, personal continuity | Do not imply the engine proved a link just because prose has similar words |
| C1: Open Journal | “Where do I start?” | Authorized published passage collection and navigable index | A legible overview of the life, not 2,000 expanded prose blocks | Scale and ownership | No mandatory ‘Chapter 17’ or arbitrary three-act progression |
| C2: Narrow | “Find the old gift” | Original indexed text, saved bookmark or verified derived reference | Search/filters if available, otherwise exact sequence/window navigation | Investigation | If no index/source links, show narrower capability, not fictional results |
| C3: Preview | “Is this the moment?” | Exact source passage plus permitted extract; optional derived gist | Distinguish quoted excerpt from generated synopsis; show why this result is relevant | Recognition | Missing synopsis falls back to source text; no fabricated importance score |
| C4: Read | “Read the original” | Passage ID + original stored title/paragraphs | Beautiful focused reader, previous/next, stable navigation and historical label | Intimacy and nostalgia | Old choices displayed inert; no new roll, action or spend |
| C5: Trace | “What followed?” | Adjacent passage sequence; optionally source-backed known response/events | Step through nearby original publications; distinguish publication order vs fictional time | Narrative discovery | An unrecorded link cannot be reconstructed as a confident fact |
| C6: Mark | “I want to remember this” | Player-private preference if supported | Bookmark/private note as a reader mark, not game canon | Curation and ownership | Bookmark write failure does not mutate story or imply a new event |
| C7: Return | “Back to the present” | Newest authorized snapshot, independently of reading cursor | Explicit Back to Now preserving Journal position for later | Continuity | Historical cursor does not become live gameplay timestamp |
| C8: Later visit | “Continue reading where I was” | Stored local position or optional preference persistence | Restore chosen passage and overview position where legitimate | Familiarity | Never promise cross-device persistence without a stored preference feature |

### Long-history shape stress

- **1 passage:** overview doesn't pretend a graph/story arc exists. The lone passage is immediately readable; no artificial index chrome.
- **20 passages:** reader can both skim and step sequentially, including repeated titles, missing illustrations and short dialogue.
- **2,000 passages:** position jump, search and viewport pagination must be designed to avoid loading all full prose; #1500 can be addressed directly when source access/index supports it. A speculative mockup must label the missing API requirement.
- **15 rapid passages in one exchange:** grouping can be an editorial reading aid, not fifteen false scenes/chapters.
- **Later relevance:** an old gift can acquire new significance in a recomputed *derived* overview while the original paragraph remains unchanged.

**Gate test:** give the participant only “Find the moment where you first gave them the compass, read the exchange, then return to your latest choice.” Measure success and misinterpretations across 1/20/2,000 passage sets.

## Journey D — Cross-cutting recovery, deliberately unglamorous

This is not a fourth primary product flow. It is the consistency test that every journey must survive.

1. **Snapshot unavailable:** show whether there is any safe last-known content, request status and refresh; never regenerate by default.
2. **Command acceptance ambiguous:** freeze original intent identity; reconcile receipt and latest server state; do not call the action again from an effect.
3. **Paid continuation failed:** distinguish committed mechanics from missing prose and uncertain billing; expose only safe controls.
4. **Authority changed or story revoked:** remove private display; do not restore from stale caches.
5. **No event after absence:** valid quietness, not a broken experience or an excuse for fake recaps.
6. **Historical asset missing:** keep original text; show a nondeceptive media fallback.
7. **Story too abstract for usual context:** omit irrelevant inventory/map/portrait, retain meaningful navigation and prose quality.
8. **Shared play future:** a participant cannot inspect another participant's private historical perspective merely because their story IDs match.

## Design research questions derived from these journeys

- Does an authored one-minute demo convey earned time without implying that demo waits are real?
- Can a player distinguish an accepted action from a pending narrated result without reading technical jargon?
- Does the return prelude make action discoverable faster, or does it obstruct the scene?
- Which historical reading mode supports *re-finding* a moment versus *re-reading* it? The two tasks are not the same.
- How do mobile readers recover their place after an abrupt new live update, permission expiry or app interruption?

The expected output of human walkthroughs is **observed confusion and revised priorities**, not “pass” because a storyboard reads plausibly in Markdown.
