# Implementation contracts

These contracts specify the intended implementation, not existing exports or authorization. The accepted canonical architecture governs. [READINESS.md](READINESS.md) records unresolved decisions and evidence; [PROOF.md](PROOF.md) owns deadline allocations and acceptance. No dispatch until commission.

The parent supplies only the selected execution card and the relevant contract sections to its child.

| Card | Contract |
| --- | --- |
| T01–T02 | [Helm artifacts](contracts/artifacts.md) |
| T03 | [Identity and bounded reads](contracts/identity.md) |
| T04 | [Custody and owned processes](contracts/custody.md) |
| T05.1–T05.3 | [Inventory, classification and receipts](contracts/classification.md) |
| T05.4 | [External observation and ensure callers](contracts/observation-callers.md) |
| T06 | [Foreground connection](contracts/connection.md) |
| T07 | [Collector upgrade](contracts/upgrade.md) |
| T08 | [Proof ownership and resource ledger](contracts/proof-ownership.md) |
| T09 | [Signal queries and timestamp freshness](contracts/signal-queries.md) |
| T10 | [Health and resource proof](contracts/health-resources.md) |
| T11.1–T11.3 | [Persistence and outage](contracts/disruptions.md) |
| T11.4–T11.6 | [Isolated partial install](contracts/partial-install.md) |
| T12 | [Parent integration](contracts/integration.md) |

For existing references to sections of INTERFACES.md, use the corresponding task row above. The complete previous file is preserved at [the pre-consolidation revision](https://github.com/DenisSkulovic/offscreen-rpg/blob/0404baf17c69765bac4e32b30403fff578042ed1/work/changes/open/2026-11-27--observability-developer/INTERFACES.md).

The exact task algorithms, proof commands and pending candidate decisions are retained in the linked contracts. No technical ratification or live proof is implied by this reorganization.
