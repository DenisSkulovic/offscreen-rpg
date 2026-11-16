# Documentation

Product behavior is the bible. Technical contracts say what the system must guarantee. Code and tests are artifacts of those contracts. A selected target is not a claim that it is implemented. A proposed design is not a norm.

Start here, then open the owner. Two steps should be enough for a scoped question.

| Question | Owner |
| --- | --- |
| What is the game, in one place? | [Vision](product/foundations/vision.md) |
| When does fictional time move, and what if I do nothing? | [Time and autonomy](product/gameplay/time-and-autonomy.md) |
| Who may change dice, items and commitments? | [Rules](product/gameplay/rules.md) |
| What may the Storyteller invent, and what must it refuse? | [Behavior and quality](product/storyteller/behavior-and-quality.md) |
| What should the player see on return, and what is still a draft? | [Return and journal](product/experience/return-and-journal.md) · [shared play](../work/designs/open/shared-play/README.md) · [player replay](../work/designs/open/player-replay/README.md) |
| What engine are we building toward, and why not a chat that writes truth? | [Selected engine](technical/engine/selected-architecture.md) · [decision](decisions/D-0001--modular-engine.md) |
| Does the model have a bounded loop, and when must it stop? | [Controller](technical/storyteller/operation-and-controller.md) · [prompts and tools](technical/storyteller/prompts-and-tools.md) |
| What may staff see or change, and what is only proposed? | [Authority](product/admin/authority-and-governance.md) · [Player 360](product/admin/player-360-and-support.md) · [LiveOps](product/admin/gameplay-and-liveops.md) |
| What is a forensic turn, and what was the model shown? | [Turn capsule](technical/observability/identities-and-evidence.md#turn-evidence-capsule) |
| Where do hydration, cache and commands live? | [State and server boundary](technical/client/state-and-server-boundary.md) |
| How do I run a Chamber test without paying a model? | [Chamber fixtures](technical/lab/chamber-and-fixtures.md) · [local development](runbooks/local-development.md) |
| How do I operate the portfolio locally? | [Runbooks](runbooks/README.md) |
| What is actually true this week, and which Change may be implemented? | [STATUS](../STATUS.md) · [strategy](../ROADMAP.md) · [change selection](../work/changes/README.md) |

Subject maps: [product](product/README.md), [technical](technical/README.md), [runbooks](runbooks/README.md). Open policy that is not accepted lives under [work/designs](../work/designs/README.md). Dated observations live under [evidence](../evidence/README.md). Coding-agent rules live under `.agents/`, separate from in-game provider cost ([spending](technical/platform/spending-and-entitlements.md)).

Historical Change dossiers stay in `work/changes/archive/`. They are not the first place to read the current contract.
