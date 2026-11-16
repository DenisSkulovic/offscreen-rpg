# Settings and accessibility

**Owner (DOC01 P2):** player-facing controls that are not Storyteller creative presets, plus accessibility obligations.  
**Creative Storyteller controls:** [profiles and settings](../storyteller/profiles-and-settings.md).  
**Technical a11y implementation:** client technical owners (P3).

## Player settings (product)

Settings change supported play preferences with captured impact visible before confirm. They must not rewrite past facts, secretly enlarge spending authority, or silently reinterpret creative fields as invent/risk authorities.

Personal preferences (accessibility, sound, private notifications) remain personal even when a campaign locks creative/speed settings.

## Accessibility obligations

Design target: WCAG 2.2 AA for player-facing web where applicable, with motion-sensitivity guidance (SC 2.3.3). Game fiction is **not** an exception to accessible controls.

- Every color, animation, icon or spatial cue that conveys “what is happening / committed / actionable” has a text equivalent.
- Passages are semantic narrative text with sensible heading hierarchy—not canvas-only bitmaps.
- All offered intentions and controls work by keyboard with visible focus.
- New passages should not steal focus or force auto-scroll while someone is reading; offer a discreet “New passage available.”
- Live updates use modest polite announcements; avoid announcing every timer tick.
- Distinguish HTTP acknowledgment from completed world consequence in assistive messaging.

Source detail for later fold: experience `system/accessibility-and-voice.md`.
