# P3-B Writer provider transport and financial custody

State: Done
Integration: `undertaking/storyteller-workshop` (catalog/QUEUE not edited while sibling lanes are open)

Outcome: `createWriterRoundTransport` sends one captured Writer wire under a pinned model policy. `advanceWriterMissionProviderStep` reserves under that policy, settles reported usage, releases an unsent rejection, and does not send again after `dispatched` or `uncertain`. Scripted calls that omit `providerPolicy` still settle the historical zero-usage receipt.

Proof: `packages/storyteller/test/writer-round-transport.test.ts` (6 pass). `packages/application/test/p3b-writer-provider-custody.integration.test.mjs` (settlement, unavailable grant, uncertain replay, already-dispatched, scripted zero). WR03 custody regression pass. Provider spend: none.

Limitation: no live OpenRouter call. Cursor A still injects this transport into `writer-loop.ts`.
