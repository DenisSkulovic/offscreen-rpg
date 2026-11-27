# WIKI08 | Author-drafted claims

Drafted by the implementer at `024c05b5`. This is not an independent review and it is not a score for the whole wiki. Each row is a sentence that was read in the named file. Verdict `author-checked` means that sentence and its negative were seen. It does not mean a second person agreed.

| # | Kind | Owner | Assertion | Negative | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | authority | `docs/product/experience/principles.md` | The page owns what the browser experience must never compromise. | It does not own the React runtime, and shared campaigns stay an open design. | author-checked |
| 2 | authority | `docs/product/gameplay/time-and-autonomy.md` | The page owns when fictional time advances and what absence means. | Scheduler length is not a player setting. | author-checked |
| 3 | authority | `docs/product/admin/commercial-and-trust.md` | The page is proposed. It is not a production grant to refund, export, delete, or read private narrative. | Legal review is still required. | author-checked |
| 4 | authority | `docs/product/storyteller/behavior-and-quality.md` | The page owns narrative behavior the product owes players. | It does not own proof that sustained multi-turn quality already works. | author-checked |
| 5 | authority | `AGENTS.md#boundaries` | Paid model providers, deploy, secrets, and non-disposable data need task-specific permission. | Local disposable infrastructure does not need that same permission. | author-checked |
| 6 | authority | `docs/product/experience/play-and-decisions.md` | The page owns the in-story interaction surface. | It does not own mechanical resolution or Storyteller prose quality. | author-checked |
| 7 | authority | `docs/product/admin/ai-engineering-and-investigation.md` | A rollback does not unpublish a passage that already went out. | Stopping new dispatch does not cancel a charge already in flight. | author-checked |
| 8 | authority | `docs/product/gameplay/continuity.md` | The page owns sparse-world continuity and lasting consequence. | Storyteller retrieval craft lives on the memory page, not here. | author-checked |
| 9 | source | root `package.json` | `test:fast` runs Turbo for `@offscreen/web`. | The script name is not a recorded passing run. | author-checked |
| 10 | source | `apps/web/package.json` | `test:watch` is `vitest` and `test:fast` is `vitest run`. | Those names were not executed for this packet. | author-checked |
| 11 | source | `docs/runbooks/local-development.md#fast-frontend-workflow` | The runbook says those three commands are present. | It says not to treat them as still planned, and it does not claim they passed. | author-checked |
| 12 | source | `docs/runbooks/local-development.md#fast-frontend-workflow` | The current executor is the frontend skill and the client architecture. | The 2026-11 playbook is dated evidence, not the current executor. | author-checked |
| 13 | source | `docs/technical/platform/topology.md` | Current entry points are the API, application, and Storyteller READMEs. | The 2026-11 code-navigation inspection is dated evidence. | author-checked |
| 14 | source | `docs/technical/storyteller/context-and-memory.md` | The implemented package pointer is `packages/storyteller/README.md`. | The 2026-11 engine-model inspection is dated evidence. | author-checked |
| 15 | source | `docs/technical/client/presentation-runtime.md` | The framework contract pointer is client architecture. | `docs/engineering/targets/react-next.md` is not cited. | author-checked |
| 16 | source | `docs/technical/client/architecture.md` | React/Next is the selected frontend architecture. | “Architecture selected” is not the sentence “code not implemented.” | author-checked |
| 17 | future | `docs/technical/observability/identities-and-evidence.md` | The evidence graph is a selected target and is not a proposal. | It is not implemented except named landed reads, and it does not authorize a migration. | author-checked |
| 18 | future | `docs/technical/observability/capture-and-provenance.md` | The page says proposal only. | No code, schema, or test is authorized by that page. The scanner still warns. | author-checked |
| 19 | future | `docs/technical/observability/telemetry-and-diagnostics.md` | The page says not installed or authorized. | It was not moved and was not ratified. The scanner still warns. | author-checked |
| 20 | future | `docs/product/experience/entry-and-onboarding.md` | The page owns arriving, signing in, and creating a life. | A platform-ecosystem umbrella remains proposed. | author-checked |
| 21 | future | `docs/technical/platform/identities-and-access.md` | Shared-play rules are proposed, not selected on that page. | “Not selected here” is about shared play, not a demotion of the identity page. | author-checked |
| 22 | future | `STATUS.md#orientation` | Capture and telemetry stay proposal-status technical pages. | They are not selected or installed systems. | author-checked |
| 23 | future | `AGENTS.md` | React/Next architecture is selected. | The engine, application, and database own rules, time, permissions, publication, and provider costs. | author-checked |
| 24 | future | `docs/product/experience/navigation-and-stories.md` | The page owns the player’s mental map of spaces. | It does not own a flows, patterns, or spaces taxonomy. | author-checked |
| 25 | navigation | `AGENTS.md` | An unknown question starts with `pnpm wiki:find` and then one `pnpm wiki:read`. | Stop when the rule, the source, and a negative case are known. | author-checked |
| 26 | navigation | `.agents/skills/implementation-handoff/SKILL.md` | Frontend handoffs use the frontend-engineering skill. | The 2026-11 execution playbook is dated evidence. | author-checked |
| 27 | navigation | `docs/technical/storyteller/operation-and-controller.md` | The opening has a one-line question-to-heading route. | The long sections were not split. | author-checked |
| 28 | navigation | `docs/product/experience/presentation.md` | The page owns atmosphere, honest media, and illustration that does not block the text. | The body was not rewritten. | author-checked |
| 29 | navigation | `docs/product/experience/settings-and-accessibility.md` | The page owns player-facing controls that are not Storyteller creative presets, plus accessibility obligations. | The DOC01 owner line is gone. The body was not rewritten. | author-checked |
| 30 | navigation | `docs/technical/client/presentation-runtime.md` | A missing historical path was replaced with the living architecture page. | The scanner’s missing-path warning for `docs/engineering/targets/react-next.md` is gone. | author-checked |

Repaired before this list: the runbook called `test:fast` unimplemented; the playbook and two inspections were written as the current route. Left on purpose: capture and telemetry still read as proposals inside `docs/technical`. Canonical page count stayed 74.
