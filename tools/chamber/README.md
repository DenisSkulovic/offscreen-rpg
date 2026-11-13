# Chamber: local developer and Storyteller evaluation launcher

`@offscreen/chamber` composes an **explicitly local developer harness** around ordinary API/web/worker/application flows. It is not the player's production gameplay API, and its fixture/probe behavior must not be promoted into universal game rules. See [QA journeys](../../docs/engineering/qa-journeys.md), [development](../../docs/development.md) and [provider dispatch review](../../docs/technical/provider-dispatch-review.md).

**Selected laboratory:** [Chamber C01–C16](../../docs/engineering/targets/chamber-laboratory.md) and [CH01–CH16 code program](../../docs/engineering/chamber-program.md). **CH01 catalogue + CH02 Bench** are implemented; Sandbox/Connected/packet/live lanes remain future CH packets. For source investigations use the small [launcher mode map](src/README.md), not 1,500 lines of main.ts.

## Find the inspection mode

| Need | Source | Boundary |
| --- | --- | --- |
| Pure Bench (no DB/Nest/browser) | [lab/bench.ts](src/lab/bench.ts), `pnpm chamber:bench -- <scenarioId> --seed=N` | Real `@offscreen/game` policies only |
| Command-line mode selection, auth/bootstrap, child processes | [main.ts](src/main.ts) | Launcher composition, **not** application use-case ownership |
| Capture a held opening without provider dispatch | [packet-review.ts](src/packet-review.ts) | Normal admission → exact review hold |
| Capture a held memory packet / comparison | [memory-packet-review.ts](src/memory-packet-review.ts) | Scripted/held evidence, **not** accepted recall or playability |
| Evaluation configuration and optional live run | [evaluation-config.ts](src/evaluation-config.ts), [live-evaluation-run.ts](src/live-evaluation-run.ts) | Explicit separate preflight, funding and owner authorization |
| Memory evaluation supervision | [memory-evaluation-run.ts](src/memory-evaluation-run.ts) | Bound model rounds/reads/spending; no default live permission |
| Controlled process shutdown | [stop.ts](src/stop.ts) | Local launcher cleanup |

Use the corresponding root `pnpm chamber:packet`, `chamber:memory-packet`, `chamber:evaluation-packet` or `chamber:review` workflow only after reading its documented side effects. **Do not run `chamber:evaluation-run` or other live modes without task-specific authorization.** The package `start`/ `review` scripts do not by themselves establish whether a command is provider-free; mode selection matters.

The package has `build`, `typecheck`, `start`, `review`, `test`; [launcher cleanup tests](test/stop.test.ts) are local checks, not a sustained player acceptance run. For actual game logic use [application ownership](../../packages/application/README.md), not launcher internals.
