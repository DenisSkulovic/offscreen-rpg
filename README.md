# Offscreen RPG

**An AI storytelling RPG where your character’s life continues while you’re away.**

Create a character, give them a routine, and follow a life that unfolds over time. A quiet journey can become an unlikely friendship, a dangerous interruption, or a story you return to days later. Step in when you want to. Otherwise, the character acts within the autonomy you gave them. Hit pause when life needs to wait.

> **Status: product design baseline v0.01.** This repository currently contains product specifications and documentation checks. There is no playable build, deployed demo, or measured runtime performance yet. Technical design and the first implementation are next.

## The experience

- **A life between visits.** Routines, travel and consequences continue while the campaign runs; ordinary unanswered invitations use permitted character decisions.
- **An active AI storyteller.** Different storytelling styles can introduce incidents and connect people, places and past choices without simulating every inhabitant of a world.
- **Continuity that matters.** Someone you met—or an object you gave away—can return much later. Established facts survive between scenes.
- **Agency when you want it.** Observe, intervene, change direction, delegate or pause. Contextual choices versus free-text input remain a design decision.
- **An atmospheric interface.** A simple browser experience focused on the current scene, contextual actions and a story-so-far chronology. Quiet moments belong on screen too. Messaging integrations are being considered for brief updates and decisions.

The platform aims to support different settings and kinds of characters through bounded mechanical profiles. D&D is the intended rules foundation; the source subset and extensions are still to be selected. Universal generated mechanics are an ambition, not an implemented capability.

## Engineering focus

The first implementation will explore sparse persistent world state, recoverable time progression, validated storyteller actions, meaningful autonomous decisions, and explicit AI context and spending limits. Ordinary simulation should not require a model call on every tick.

This is a senior fullstack engineering portfolio project. The goal is a small, coherent game backed by demonstrable reliability and thoughtful AI integration. Architecture, model/provider choices and deployment will be documented as they are selected; this README does not imply they already exist.

## Explore the design

| Start here | What it answers |
| --- | --- |
| [Product vision](docs/product/PRODUCT_VISION.md) | What experience are we building? |
| [First-release scope](docs/product/foundations/scope-and-release-plan.md) | What belongs in the initial slice, later, or possibly never? |
| [Next design decisions](docs/TASKS.md) | What must be settled before implementation? |
| [Storyteller and events](docs/product/worlds/world-events-and-causality.md) | How can stories develop while respecting game state? |
| [AI budgets](docs/product/ai-experience/cost-budgets-and-degraded-play.md) | Where do models add value, and how are costs bounded? |
| [Documentation index](docs/DOCUMENTATION_TREE.md) | Where do the supporting contracts live? |

## Working with this repository

Documentation uses stable IDs and relative links. Run the dependency-free checks with Python 3.10 or later:

```sh
python scripts/check_docs.py
```

The same checks run in GitHub Actions. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [AGENTS.md](AGENTS.md) for coding-agent guidance. Acceptance scenarios are proposed tests; they are not evidence of implemented gameplay.

## Content and licensing

Fictional settings mentioned in design examples are illustrative references, not bundled assets or claims of affiliation. No third-party rulebook text or game assets are included. Source selection and licensing are release decisions still to be resolved. No project license has been selected yet.
