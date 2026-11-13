# Research dossier | borrowed ideas, rejected habits and evidence quality

**Reviewed:** 2026-11-13. This is a **design synthesis**, not a claim that these games or libraries endorse our product. Screenshots are study references, not reusable art or licensed assets.

## Primary UX and accessibility references

| Source | Applicable principle | What Offscreen RPG does with it |
| --- | --- | --- |
| [Nielsen Norman Group: 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Visibility of system status, match with real world, user control, recognition, error prevention | Clearly distinguish committed outcome from pending/estimated state; use familiar player verbs; expose context without forcing recall |
| [NN/g: Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/) | Contextual visible choices reduce memory demand | Offer suggested intentions and relevant people/items in-context; do not require player to remember command syntax |
| [Yale: Memory-Free Interaction](https://usability.yale.edu/ux/best-practices/memory-free-interaction) | Keep earlier decisions/context retrievable | Re-entry recap, visible story identity, review step during creation |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Operable content, readable status, target size, focus, timing, reduced motion | Keyboard/screen-reader equivalents, meaningful time-limit policy and animation fallbacks |
| [W3C ARIA APG](https://www.w3.org/WAI/ARIA/apg/about/introduction/) | Well-defined dialog, tabs and keyboard patterns | Accessible primitives rather than custom-div controls |
| [WCAG: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) | Avoid motion that distracts or harms; allow disabling | Disable nonessential motion for reduced-motion preference; meaningful state cues cannot depend on animation |

**Important timing tension:** WCAG 2.2 SC 2.2.1 protects users against many content-imposed time limits, with exceptions for essential real-time behavior. Offscreen RPG's earned-time fantasy is not automatic permission to create unreadable expiring UI decisions. For any response window, define whether adjustment/pausing is allowed and validate the accessibility approach with the actual mechanic. A timer and a deadline are not the same thing.

## Narrative/game interaction references

| Reference | What is useful | What must not be copied |
| --- | --- | --- |
| [Failbetter Games: narrative structures / storylets](https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two) and [pacing](https://www.failbettergames.com/news/narrative-snippets-pacing) | Storylets show context-specific opportunities; repeatable content should remain concise and retain meaningful choice | An action-energy economy, an endless card catalogue, gate-heavy menus or repetitive click grind |
| [Roadwarden development diary](https://assemble-entertainment.itch.io/roadwarden/devlog/113863/the-new-chapter-about-steam-demo-and-others-roadwarden-devlog) | Readable prose + choices, scroll when content requires it, contextual inventory, integrated travel description | Mandatory illustration/map, exact inventory controls or the game's IP/assets |
| [PC Gamer: Roadwarden UI/example](https://www.pcgamer.com/roadwarden-feels-just-like-cracking-open-a-huge-fantasy-novel/) | Spatial relationship of illustration, narration and decision choices | Equating all scenarios with medieval travel |
| [Nintendo: Citizen Sleeper](https://www.nintendo.com/us/store/products/citizen-sleeper-switch/) | Work/survival decisions presented with visible stakes and a strong world identity | Literal dice slots/energy-per-cycle economy, space-station styling or “end day” mechanics |
| [Fallen London browser play analysis](https://www.pcgamer.com/games/rpg/ive-swapped-modern-live-service-games-for-a-browser-game-thats-been-running-since-2009/) | Long-lived browser fiction can create durable attachment and a recognizable story space | An overwhelming navigation bar or permanent accumulation of equal-weight opportunities |

**Inference:** These references support *pieces* of our design, not a single ready-made product template. Offscreen RPG's specific offscreen-commitment + re-entry loop is the distinguishing interaction and must be tested in its own right.

## Component and motion technology references

| Candidate | What it is good for | Recommendation |
| --- | --- | --- |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) | Unstyled accessible dialogs, sheets, popovers, toggles, menus, focus/keyboard | **Preferred behavior primitives** for complex standard controls where native HTML is insufficient |
| [shadcn/ui official](https://ui.shadcn.com/docs/cli) | Copy-owned React component patterns, customizable starter foundation; supports base variants | **Selective accelerator only**. Do not paste the default shadcn look onto the game |
| [React Aria Components](https://reactspectrum.adobe.com/react-aria/) | Accessibility/internationalization for advanced interactions | Strong alternative if Radix lacks a necessary behavior. Do not mix full overlapping systems casually |
| [Motion for React](https://motion.dev/docs/react) and [AnimatePresence](https://motion.dev/docs/react-animate-presence) | Declarative entrance/exit/layout transitions | **Preferred measured micro-interaction layer** where CSS transitions are insufficient |
| [Rive](https://rive.app/features) | Interactive animated vector scenes and state machines | **Optional specialty art tool**, not a UI framework or dependency for basic gameplay. Evaluate licensing, authoring and loading cost first |

The library selection is an **architectural recommendation**, not a verified compatibility or package-installation authorization. Existing Next/React/TanStack/RHF/Zod engineering decisions continue to apply. Check stable versions and bundle results inside the code-bearing Change, not by guessing version numbers here.

## Heuristic review: seductive mistakes to avoid

1. **“Game-like means everything moves.”** Constant background animation competes with reading and obscures actual world updates.
2. **“LLM game means put a chat box everywhere.”** Conversation is not the whole world, and typed statements are not verified effects.
3. **“Progression means dashboards.”** A world that remembers an object given to a friend can be emotionally richer than 17 counters.
4. **“RPG means inventory grid, map, stats, quest log.”** Many valid worlds have none of those.
5. **“A beautiful mockup proves UX.”** Authentic long prose, loading, late decisions, stale offers, budget exhaustion, a mobile screen and keyboard navigation expose the actual design.
6. **“More options means more agency.”** Unsupported or near-duplicate options create choice theater.

## Research still needed before visual implementation

- Observe a few unfamiliar players describing what the game *is* after seeing a working first scene.
- Compare a narrative-first composition and a restrained scene + shelf layout on actual story content.
- Test an interrupted four-hour commitment versus a simple timed wait; users should understand the difference.
- Test a nonhuman setting where most fantasy UI affordances do not apply.
- Have accessibility users evaluate how incoming passages and decision holds are announced.

Do not reproduce source screenshots/assets in public repo without permission. External links are study references; interface patterns should be reinterpreted with original content and styling.
