# Accessibility, language and interaction voice

**Design target:** WCAG 2.2 AA for player-facing web where applicable, with additional motion sensitivity guidance from SC 2.3.3. **Do not treat game fiction as an exception to accessible controls.** Use [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [ARIA APG](https://www.w3.org/WAI/ARIA/apg/about/introduction/) as primary technical references.

## Information must be understandable without sight or motion

A player needs to know what is happening, what has been committed, and whether they can act. Every color, animation, icon or spatial cue that conveys those facts has a text equivalent. “Decision waiting,” “Paused by you,” “Repairing” and “Narration unavailable” must not all be a colored dot.

A passage is semantic narrative text with a sensible heading hierarchy, not a canvas-only bitmap. Typography at browser zoom, long character names and complex Unicode from arbitrary worlds must remain readable.

## Focus, keyboard and reading continuity

- Use native button/link semantics or tested accessible primitives, not click handlers on anonymous divs.
- All offered intentions and controls work by keyboard with visible focus.
- Focus stays on a submitted intention while its transport state changes, unless the control disappears and focus must move to a logical successor.
- Dialogs/sheets trap focus only when modal; Esc/close/back are predictable, and closing returns focus to the trigger when possible.
- New passages should **not steal focus or force auto-scroll** while someone is reading previous prose. Offer a discreet “New passage available” / “Go to current scene.”
- Every large surface has skip navigation to main content/current decision. Journal search results are keyboard navigable with useful headings and links.
- Free-intent (future) composer must preserve typed text on failed interpretation/connection and identify exactly what will be committed before acceptance.

## Live updates and assistive technology

Use modest, **polite** announcements for “Action accepted,” “New passage available,” “Journey paused” and “Something needs your attention.” Avoid announcing every second of a timer or every numerical progress tick. Urgent assertive announcements only for true attention-critical events and never as a constant feed.

An HTTP acknowledgment and completed world consequence require different announcements. “Your action is being checked” is the right message when ACK was lost. A hidden disabled option should include an accessible explanation when it is relevant; do not make screen-reader users navigate a forest of irrelevant disabled cards.

## Time and choice accessibility

Game time is deliberately costly; **reading time must not be**. Reading options does not advance fictional time. A response deadline, if the mechanic supports one, is a different real-world time limit and needs deliberate accessible policy: adjustment/extension/pause where rules permit, early warning and a meaningful default/hold explanation. WCAG 2.2 SC 2.2.1 has defined exceptions for genuinely essential real-time behavior; do not assume every narrative timer automatically qualifies.

Display dates and countdowns in understandable locale-aware units, with explicit distinction between **in-world time** and **real time**. No bare “00:20:00” without explaining which clock it refers to. Changing locale does not change fictional meaning. Offer unambiguous time zone for external deadlines if they exist.

## Motion and media

Respect `prefers-reduced-motion`. Nonessential layout movement/parallax can be disabled; all results remain readable. Avoid flashing, auto-playing video/sound and endless ambient elements that interfere with focus. Illustrations have meaningful alternative text when they communicate scene information; decorative art is correctly ignored by assistive technology. If an image is the only description of a clue, provide that clue in text, respecting character knowledge.

## Interaction-writing voice

**Fiction can be lyrical. System copy must be literal.** The story's creative profile may be comic, threatening, melancholy, surreal or minimal. System controls explain concrete behavior in consistent language and do not adopt an unreliable narrator's ambiguity.

| Avoid | Prefer | Why |
| --- | --- | --- |
| “Continue” | “Ask who sent him” / “Resume repair” | Names the actual action |
| “Processing resolution...” | “Your attempt was accepted; the result is being prepared.” | Player meaning over internal noun |
| “Something went wrong” | “The action finished, but the Storyteller could not write its account.” when true | Distinguishes mechanics from prose |
| “Simulation active” | “Repairing the beacon · 3/5 completed units” | Specific and falsifiable |
| “Retry” everywhere | “Check status,” “Retry narration,” “Resume story,” or no action | Prevents duplicate effects and surprise bills |
| “Nothing happening” | “No activity is underway. Time will not advance until you choose.” | Deliberate clock made clear |
| “Free choice” | “Describe another attempt; the world decides the outcome” | Doesn't promise omnipotence |
| “Chapter 3” | A dated passage, situation title or journal position | No chapters in the product model |

Use chosen pronouns and names as actually supplied by content; do not assume binary human characters. Story names may be very long, multilingual or absent during creation. Controls are translatable; avoid embedded English sentences in icon artwork.

## Accessibility sign-off tasks

Run keyboard-only across J1–J8; screen reader readout for scene heading → prose → choices → status; 200% and 400% zoom; 320px width; reduced motion; forced/high contrast where relevant; no-image mode; slow network / 30-second pending; session expiry in creation; interrupted activity. Use automated axe checks as **one layer**, not as proof of good reading or understandable language.

**Human failure condition:** if someone cannot independently tell whether their action actually happened, accessibility and UX both fail, no matter how many aria labels passed tests.
