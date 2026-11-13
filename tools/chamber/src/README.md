# Chamber local launcher | source and mode map

**Current:** [`main.ts`](main.ts) is a ~1,518-line local launcher, not the game engine. CH01–CH04 add catalogue, [`lab/bench.ts`](lab/bench.ts), semantic specimens, and Sandbox URL guards (`offscreen_chamber_run_*`). Manual launcher DB remains `offscreen_chamber` / `offscreen_story_local`.
**Selected future:** [Chamber target](../../../docs/engineering/targets/chamber-laboratory.md) and [technical scenario protocol](../../../docs/technical/chamber-lab-protocol.md) for remaining lanes without breaking safe existing CLI options.

| Entrypoint/use | Start in source | Guard or behavior to preserve |
| --- | --- | --- |
| Pure Bench | [`lab/bench.ts`](lab/bench.ts), `pnpm chamber:bench` | Real `@offscreen/game` only; no DB |
| Sandbox DB name guard | [`@offscreen/application` sandbox-guard](../../../packages/application/src/developer-tools/lab/sandbox-guard.ts) | localhost + `offscreen_chamber_run_<32hex>` only; never `offscreen_chamber` / `offscreen_auth_test` |
| CLI flags and mutually exclusive modes | `main.ts` around lines 68–166 | `--smoke`, `--review`, `--packet-review`, `--memory-packet-review`, `--evaluation-*`, `--story-mode`, `--reset-database`; don't casually enable live mode |
| Local DB and service boot | `main.ts` around lines 555–895 | exact database `offscreen_chamber` or `offscreen_story_local`, localhost-only URL, explicit reset, migrations, fixture user, Nest `developerTools: !storyMode` |
| Worker/browser/QA | `main.ts` around lines 895–1518 | local Temporal queue, live/packet branching, optional Next/Chromium; not a cheap pure rule test |
| Held opening | [`packet-review.ts`](packet-review.ts) | actual prepared dispatch-review hash, DB accounting zero, temp evidence |
| Held long-story/memory | [`memory-packet-review.ts`](memory-packet-review.ts) | canonical corpus, held packet, scripted retrieval, zero dispatch |
| Live evaluation preflight | [`live-evaluation-run.ts`](live-evaluation-run.ts), [`evaluation-config.ts`](evaluation-config.ts) | exact selected route/provider/cost preflight, explicit authorization/reconciliation |
| Long-story live evaluation | [`memory-evaluation-run.ts`](memory-evaluation-run.ts) | bounded rounds and read, committed usage; never automatic |
| Cleanup and abort | [`stop.ts`](stop.ts) | teardown browser/runtime/web/app/DB even after errors; [stop tests](../test/stop.test.ts) |

**No duplicate launch protocol:** new CH CLI/Bench should be thin wrappers over the *one* typed scenario registry/executor. Direct pure policy checks launch no Nest/DB/Temporal/Chromium. Connected rig uses guarded isolated run resources, not ordinary `offscreen_chamber` by default.

**Cursor first reads:** selected CH packet → relevant section above → 2–5 source symbols; do not ingest full `main.ts` just to inspect a flag or branch. Use `rg -n` and a bounded range. The [integration warning](../../api-integration/test/README.md) explains disposable DB reset. No provider calls or services are authorized merely by this README.
