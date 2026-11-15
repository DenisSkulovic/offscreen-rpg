# Supporting spaces | Journal, World and You

**Status:** experience destination. These are **reading and orientation** surfaces. They must not make the player operate a simulated database.

## Journal: one life, three depths

**Top:** a concise “Where this life stands” view when derivable from sources. Active threads, known relationships and commitments are presented as *facts or beliefs with provenance*, not quests auto-created from every sentence. A story that has no grand arc still has a meaningful chronology.

**Middle:** an ordered set of meaningful entries with light grouping by fictional date/cycle/relative period. A settled work shift, an interrupted encounter and a conversation can appear together; repeated identical check results are compact. Filter by known text, date or entity when supported, not by an enormous taxonomy designed for the database.

**Deep:** each original passage/receipt is inspectable with an anchor, timestamp as known, relevant world context and explicit “return to Now.” Source is immutable; recaps are derived and can be replaced. Search must never expose Storyteller-private plans or secret rolls.

A story has **no mandatory chapters**. An optional date separator, jump link or bookmark is just navigation, not a model of plot structure.

### Journal wireframe

```text
JOURNAL · Greywake
[Return to Now: a stranger is waiting]

This life, so far
  The beacon still needs two repair units.
  You promised Mara you would return the lens.
  The stranger's identity is unknown.

Recent history                           Search · Filter
  Day 4   The stranger came during the repair [See source]
  Day 4   Repair advanced to 3/5 units      [Roll details]
  Day 3   Mara lent you the lens             [Passage]
  ... [Earlier history]
```

The three top lines are examples for a scenario fixture, not a promise of automatic semantic classification. If evidence is incomplete, render a narrower factual history.

## World: what the character knows

A world index contains **established** places, beings, factions or other entities whose identities are stable and actually useful. It should answer “Who was that person?” or “What do I know about the old tower?” before asking a model to regenerate a description.

Recommended information pattern:
- Known entity name and concise truthful summary.
- Character's relationship, last encounter/seen context if actually recorded.
- Source passages/events; known uncertainties and contradictory accounts clearly marked.
- Situationally relevant actions only when actively authorized in the current scene. An entity detail page is not a global teleport or summon button.
- Optional map for a geographically meaningful world, revealing only established known places. No invented blank world grid.

Some worlds are one room, one network, a microbiological colony or a consciousness without distance. World may become **Connections** or simply a compact index, and may be omitted until there is something to inspect. Never create an empty “Factions” screen because fantasy RPGs usually have one.

## You: the current form and its consequences

Show only actual relevant character attributes and supported capabilities. Organize by meaning, not universal tab layout:
- **Current condition** (e.g. fatigue, health, contamination, stability) when supported.
- **Abilities / skills** that apply to this form and active rules.
- **Significant possessions / controlled resources** when present.
- **Ongoing commitments** and prior achievements, where factual.
- **Relationships** may be linked to World; avoid duplicate authored truth.

A bodiless mind's absent Strength check is **inapplicable**, not 0/20. No forced equipment slots, currency widget, encumbrance bar or character portrait. In a normal fantasy campaign, common D&D-style values can appear, with understandable labels and expandable rule detail. Dice, mechanics and provenance are discoverable without becoming an ever-visible spreadsheet.

## Context shelf selection rules

The side shelf on Now is a **ranked, sparse lens** into these spaces. Good candidates are: one currently relevant condition, active commitment, newly encountered entity or item mentioned in the current choice. Do not mechanically dump all inventory or the latest 10 entries.

Selection of visible facts needs public state and permission controls. If client code cannot reliably determine relevance, start with one manually authored/known mechanical fact rather than build a speculative recommendation layer. Do not use paid inference on each UI refresh to decide what goes in a sidebar.

## Navigation and privacy

- Journal/World/You browsing is non-time-spending. Do not turn opening a record into an in-world “inspect” action unless explicitly authored as a separate option.
- No spoiler leaks from privately prepared future developments or hidden checks.
- Opening a World entity does not make it eligible for interaction outside its authorized situation.
- Links to past choices are **read-only**; never activate stale offer identities.
- Changing Story identity clears all scoped drawers and entity detail state; no cross-campaign cache leakage.
- Accessibility: headings, breadcrumb/back, current selection, closed panel focus return, keyboard navigation and deep-linkable durable record identities where appropriate.

## Acceptance contrasts

**Fantasy:** a known innkeeper, three coins, a damaged sword, one working repair task.  
**Nonhuman:** chemical signals, a colony boundary, a memory of hostile spores, no coins and no map.  
**Quiet domestic:** a rented room, remembered neighbor, an unpaid debt, no combat.  

All three must fit one framework without fake empty modules or hidden assumptions. If one cannot be represented, fix the information architecture or domain projection rather than adding a setting-specific exception to every component.
