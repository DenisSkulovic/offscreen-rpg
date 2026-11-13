# Game UX case studies | precise lessons for an offscreen-life RPG

**Research pass:** 2026-11-13, publicly available pages and screenshot references. **Evidence:** referenced developer posts/interviews and screenshots, *not* hands-on sessions with the games or user studies. These sources inspire testable hypotheses, not proof our interface is good. Do not copy code, art, story text or interfaces wholesale.

## Summary: none of these games is the complete template

| Game / body of research | Distinct strength worth studying | Key trap if copied literally | Our specific decision |
| --- | --- | --- | --- |
| **Roadwarden** | Literary text alongside visual scene, explicit action separation, contextual condition | Assuming every world needs landscape illustration, health and a location map | Scene reading with clear choice boundary; conditional art/context |
| **Citizen Sleeper** | Time allocation, repeatable labor, relationships and meaningful risk | Dice-placement UI, forced daily cycle, mandatory energy economy | Make **spending time with people/work** the emotional agency, without its action-economy model |
| **80 Days** | Travel/information decisions form one coherent game, not story interruption | Route atlas/map as universal UI; cities become obligatory content chores | Narration should strengthen time investment; never require prose between already admitted routine steps |
| **Fallen London / Failbetter** | Contextual storylets, bounded/recognizable options, persistent qualities | Overgrown hub/card lists, long repetitive text, energy-gated grind | Short repeatable activities, selective meaningful scenes, recorded small choices |
| **The Longing** | Real elapsed waiting can create attachment; world doesn't need hourly spectacle | Globally ticking clock with mandatory 400-day countdown regardless of accepted plans | Make long time emotionally legible; our clock/autonomy choice is a **separate product decision** |
| **Accessible web patterns** | Status clarity, progressive disclosure, visible controls, focus and timing | Hiding every important fact behind secondary pages | Show **current decision/risk/progress** immediately; other detail disclosed on demand |

## Roadwarden: visually separate "story" and "what I can do"

**Developer primary source:** [Roadwarden devlog on UI revision](https://assemble-entertainment.itch.io/roadwarden/devlog/113863/the-new-chapter-about-steam-demo-and-others-roadwarden-devlog). The developer reports adding a **horizontal separator** between narration and choices after people (including someone with color blindness) did not distinguish them through color alone. They also changed their initial no-scroll preference after it constrained content too much. [Screenshot of an actual scene/choice arrangement](https://www.pcgamer.com/roadwarden-feels-just-like-cracking-open-a-huge-fantasy-novel/).

**Lesson:** prose and action should be obviously different **semantically and spatially**, not merely by different text colors. Scrolling is acceptable, but the player should know where the new relevant choices are, including long scenes.

**Our design test:** display an eight-paragraph scene with long embedded dialogue; ask new viewers to identify which text is description vs a clickable intention at a glance. Must pass under color blindness/forced colors. A short divider and “What do you do?” area may work better than a complex card system.

**Do not copy:** pixel art, Roadwarden's button icons, permanent Vitality indicator, day/night calendar or fantasy maps. They make sense in that game, not all worlds.

## Citizen Sleeper: time spent is a relationship decision

**Designer sources:** [Xbox Wire interview with Gareth Damian Martin](https://news.xbox.com/en-us/2023/03/14/citizen-sleeper-episode-3-purge/) and [GameSpot interview on small choices and dice](https://www.gamespot.com/articles/citizen-sleeper-2-wants-you-to-fail-your-way-to-a-better-story/1100-6529132/); [Nintendo screenshot](https://www.nintendo.com/us/store/products/citizen-sleeper-switch/).

Designer discussion centers on deciding *where* to spend finite time, what relationships gradually form, and small expressions of agency through activities rather than every consequential choice being a dialogue tree. The game uses dice and a visible action economy, but **we need not adopt its particular systems**.

**Lesson:** a player's repeated modest actions can be narrative investments. Spending four evenings with a neighbor can be as meaningful as selecting a dramatic confession response. This matters for Offscreen RPG because real elapsed time gives those investments weight.

**Our design test:** show two scenarios with equivalent backend changes: (A) click work several times to accumulate an abstract resource; (B) choose time commitments which alter known relationships and enable new scenes. If B creates greater attachment, prioritize world continuity and consequential encounters over reward UI.

**Do not copy:** floating action dice, forced “End cycle,” exact energy/credits economy or a sci-fi station map.

## 80 Days: the systems and story must reinforce one another

**Primary source:** [inkle cofounder postmortem](https://www.gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i-) and [design interview](https://www.gamedeveloper.com/business/-i-80-days-i-building-the-perfect-text-adventure-for-mobile).

The postmortem notes that an early design with obligatory city content made players **skip dialogue and feel market/travel actions were chores**. Iteration changed how routes and exploration were revealed. An earlier ambition to spread the game over eighty real days was also dropped because it didn't serve the final design.

**Lesson:** long duration **cannot be a defense for tedious repetition**, and generating more prose does not automatically give it meaning. If a repair completes quietly, do not require a literary “Continue” click between the settled result and a previously authorized next activity.

**Our design test:** a player completes a bounded sequence of repair → rest → patrol. Ask whether each narrated pause added actionable understanding, discovery, or emotional consequence. If not, remove compulsory narration, not the meaningful time cost.

**Do not copy:** the game globe or 80-day deadline; the user may live as a microbe, an abstract field or a character with no travel task.

## Failbetter / Fallen London: repetition has conditions

**Primary sources:** [Pacing](https://www.failbettergames.com/news/narrative-snippets-pacing), [Agency and Choices](https://www.failbettergames.com/news/narrative-snippets-agency-and-choices), [Writing for Story Games](https://www.failbettergames.com/news/narrative-snippets-writing-for-story-games).

The writing guidance recommends brevity for repeatable content and recognizes the importance of **small player decisions being acknowledged later**. Choices should be meaningful in context, not necessarily grand. A small reusable interaction can become rich when its consequences are remembered.

**Lesson:** repeated “work/fish/rest” should not summon a fresh lengthy scene every time nor become repetitive menu spam. Meaning comes from accumulated factual continuity and occasionally changed context. The Storyteller must not overwrite known outcomes to make a good line.

**Our design test:** give one player 12 repetitions of a routine; count how often they must read an unchanged paragraph or press a meaningless intermediary “Continue.” Target near zero. Present meaningful milestones, rare events and contextual choice only when actually available.

**Do not copy:** deck structures, energy points, content locks or a content browser with 30 always-visible storylets.

## The Longing: real time can be the fiction itself

**Primary sources:** [Developer FAQ](https://steamcommunity.com/app/893850/discussions/0/1745646819953576288/) and [developer interview](https://www.gamedeveloper.com/business/road-to-the-igf-studio-seufz-s-i-the-longing-i-). The developer explicitly describes long real-world waiting and continued timer progression with the game closed.

**Lesson:** a wait can feel emotionally consequential if the fiction acknowledges it and offers curiosity during the interval. But \`The Longing\` advances a global clock even if the player does nothing. Our current contract does **not**: only accepted commitments move time.

**Product tension:** the two models deliver different fantasies. One feels like a living world independent of the player; the other preserves agency and no silent danger. A hybrid standing-routine model may preserve the best of both but requires a serious rules and consent design. See [time/agency alternatives](../foundations/temporal-philosophy.md).

**Our design test:** compare idle story reentry versus explicit standing routine vs globally ticking time. Ask players to predict consequences after 48 hours and whether they would trust the game with their character.

## General UX research, applied carefully

- [Nielsen Norman Group progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): primary decision-critical information visible, advanced configuration on request. **Not:** hide required risk in a third-level sheet.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/): response time controls, pause/stop/hide, focus and other criteria. Real game deadlines may be essential, but don't assume all can avoid accessible adjustment.
- [W3C status-message guidance](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html): announce changes to action/result without unnecessarily stealing focus.
- [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/accessibility): accessible keyboard/focus for dialogs, popovers and disclosures.
- [shadcn/ui architecture](https://ui.shadcn.com/docs): source-owned components to customize, **not** an app-wide visual identity.
- [Motion reduced-motion behavior](https://motion.dev/docs/react-use-reduced-motion): opt out of transform/parallax while retaining semantic feedback.

## Research-derived design changes to the first pass

1. **Add a visible narrative/action boundary**, not just differently colored choices. This is more specific than “scene first.”
2. **Elevate time allocation as real agency**. Daily routines and relationships must be designed as interactions, not generic "progress" widgets.
3. **Challenge idle-time contract**: explicit plan-only behavior could be emotionally false to the promise of a life happening while away, even if technically coherent. Do not silently change it; compare three product models.
4. **Be more suspicious of compulsory narration**. Every scene should justify its interruption of an already authorized routine.
5. **Do not demand a permanent illustration panel** to look game-like. Illustrations are content, not a slot the engine must fill every turn.
6. **Make choice density contextual and tested**. Not an invariant 3-card grid or enormous ten-option modal.

## Things this research does not establish

It does not prove that a particular Offscreen RPG screen is usable, that the current provider can narrate coherently over months, that a React library is compatible with our pinned packages, or that third-party images/assets can be reused publicly. It also does not establish user preference for globally ticking time: that choice deserves game-specific tests, not imitation of another successful title.

**Working conclusion:** a *living situation plus truthful time investments* is a more precise north star than “nice narrative prose.” The interface is only one layer; the gameplay must support meaningful, durable commitments.
