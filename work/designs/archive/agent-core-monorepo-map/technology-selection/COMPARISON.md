# Decision framework and evidence gaps

R5: [execution architecture comparison](EXECUTION-ARCHITECTURES.md) supplies the mechanism-level rationale and provisional experiment ordering. Gates below remain unchanged.

## Shared hard gates (not scoreable away)
G1 TypeScript/Node version-pinned dependency and licensing compatibility, self-hosted without mandatory vendor service.
G2 One execution-progress authority, deterministic Workflow bundle/replay or explicitly bounded alternative; no duplicate orchestration.
G3 Every physical model dispatch uses current trusted mission grant, stable attempt identity, route pin and atomic budget reservation; uncertain receipt cannot trigger an unapproved second paid request. Guard transport/provider adapters rather than trusting SDK lifecycle logs.
G4 All tool effects, including nested/MCP/hosted tools, go through trusted resource authorization and idempotency/uncertain hold; deny by default. Disable unsupported capabilities.
G5 Child missions never amplify grant, funding, depth, concurrency, context or trace exposure. Explicit child admission; framework defaults not authority.
G6 Tenant isolation, protected history/payload retention, no raw external traces, no implicit URL/network/credential egress.
G7 Bounded context and model compatibility (tools, schemas, usage, reasoning continuations, output types); no hidden route fallback.
G8 Cancellation, durable failure, upgrade/replay and operational debugging; no requirement for streaming or general agent graphs in first specimen.

## Comparison based on inspected docs/source, not experiment
| Candidate | Runtime ownership | Native TS model effect bridge | Control seam | Main unresolved tradeoff | Disposition |
|---|---|---|---|---|---|
| Vercel | SDK loop + Temporal | Yes | ProviderV4 Worker adapter | loop API/retry/URL prep, child scope | Primary |
| OpenAI Agents | Runner + Temporal | Yes | ModelProvider Worker adapter | version skew, child context/settings, tracing | Primary |
| Strands | Agent + Temporal | Yes | named Worker model factory, hooks | actual compatible SDK release, process model cache, nested grants | Primary (upgraded) |
| Google ADK | Runner/graph + Temporal | Yes | TemporalModel/BaseLlm | peer range excludes 2.5, fallback and node retry | Reserve |
| LangChain/Graph | prebuilt loop + graph/checkpoints | Not established | wrapModelCall/wrapToolCall | overlapping durability | Reserve if needed |
| Mastra | agent/workflow framework | Workflow step bridge, per-round unproved | provider/tool hooks | broad stack and competing resume | Reserve |
| Deep Agents | harness + LangGraph | Python evidence, TS unproved | middleware/backend | default tool scope, second durability engine | Pattern study / reserve |
| Custom | our loop + Temporal | manually defined | full control | maintenance and correctness cost | fallback baseline |

No candidate has cleared all G1–G8. [R8 runtime evidence](experiments/p0-p1/README.md#owner-operated-result-receipt-2026-11-27): all three pass basic native execution. Vercel recommended for bounded E1 on simplicity and observed footprint; OpenAI viable reserve, Strands adds a configuration Activity. R10 designer selection for isolated E1 review: Vercel; patched Zod and same-bundle replay passed. Owner ratification pending, no production authorization. G1 and G2 supported by isolated dependency and replay evidence; final pnpm closure and maintained replay/restart acceptance remain required. G4/G7/G8 restricted fixture capability, limits and lifecycle proof belong to E1 qualification. G3 paid dispatch, real G4 effects, G5 children, protected G6 payload/tenant exposure and expanded G7/G8 upgrade/modality guarantees remain gated outside E1; no gate waiver or claim of full clearance.

## Common experiment architecture
One fake HTTP provider (records request id, received bytes, dispatch count; scripted responses, loss after acceptance, delayed response, malformed tool args), one fake scoped Library/Workdesk effect store (two tenants, effect identities and atomic grant/reservation fixture), same observable mission and outputs across SDKs. Initial nonstreaming. Separate actual Temporal disposable runtime from in-process mock tests. No production data, paid calls or ambient credentials. Fake transport must not equate no response with no charge. Candidate wrappers adapt to same semantic test, not a new universal production facade.

Proof scenarios: baseline two rounds + read + stage + typed proposal; denied tool and foreign root; grant revoked after round; known failure before send vs unknown after send; crash after recorded Activity vs after effect before completion; retry preserves attempt and result; child budget/concurrency allocation; parallel tenant isolation; incompatible route and reasoning message continuation; cancellation/timeouts and no background provider work left; telemetry sink failure and network egress inspection; replay across compatible Worker revision. Verify counters and ledger independently of framework traces. Inspect actual history and demonstrate size/retention strategy rather than promise zero content.

Use existing R3 experiment plan as precursor; extend to Strands. First resolve exact artifacts and small compile/bundle, run equivalent smallest happy-path/negative custody slice across three, stop candidates that fail hard gate unless a small supported fix exists. Then run deeper child/cancellation/privacy/version proof on survivors. Evaluate maintainability by code required and supported APIs, not lines alone. P0/P1 executed under owner authorization; later experiments require selected scope and safe target/cleanup. No requirement to install all seven candidates or run exhaustive tests on eliminated alternatives.

## Committee preparation
After evidence and owner discussion, choose a single candidate or explicitly scoped combination, state strongest rejected alternatives and reasons, pin release/version, record ownership/dependency map and acceptance matrix. Self-defense must actively attack retries, tenant context, nested agents and version skew. Independent reviewer gets exact candidate SHA and scope without suggested verdict. R10 is the designer freeze candidate; independent review and owner ratification remain separate.
