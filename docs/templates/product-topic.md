---
id: DOC-REPLACE-WITH-STABLE-ID
layer: product
status: draft
domains: []
tags: []
updated: YYYY-MM-DD
relations: []
---

# <Topic title>

Owner: Denis.
Scope/release: <first slice / later / undecided>.
Dependencies: <human-readable links to authoritative topics and relevant decisions>.

Follow [document conventions](../DOCUMENTATION_CONVENTIONS.md) for IDs, controlled tags and typed relations. Fill metadata with real values; never reference a planned target as if it exists.

## Purpose and boundaries

What question does this document answer? What belongs elsewhere?

## Player experience

Describe a concrete situation, the player's intent, what happens, and why it matters.

## Concepts and behavior

Define only concepts owned here. Describe relevant states, transitions, actors, triggers, outcomes and invariants.
Reference adopted D&D mechanics and authoritative sources when relevant; do not invent missing rules.

| ID | Requirement | Status |
| --- | --- | --- |
| <DOMAIN-001> | <Observable behavior> | <Draft / accepted> |

Use IDs only when requirements are concrete. Omit the table during early exploration if prose is clearer.

## Configuration and interactions

Relevant settings, values, default status, mutability, locks and effect on actions already underway.
Address time, pause, direct/autonomous control and notification behavior only where applicable; link to their owners.

## Scenarios and acceptance examples

Given <situation>, when <action/event>, then <observable result>.
Include alternatives, interruptions and meaningful failure cases. Distinguish game consequences from product defects.

## Decisions, proposals and open questions

Link accepted decisions. Label recommendations. State what missing information or choice would resolve each open question.

## Options and forks

For substantive alternatives, record a stable local fork ID, candidate approaches, tradeoffs, dependencies and evidence needed. Separate candidate/selected/rejected from release disposition: unassigned, implement in a named release, postponed or cancelled. Do not require a decision merely to finish this draft. See WORKFLOW.md.

## Dependencies and change impact

Which other product topics must agree? Which later technical/code areas may be affected, once those exist?

---
Adapt this template. Do not populate irrelevant sections or make up decisions to produce a complete-looking document.
