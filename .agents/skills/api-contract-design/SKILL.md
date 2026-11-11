---
name: api-contract-design
description: Design or review a consequential HTTP/API/client-server contract, resource or command lifecycle, error/retry semantics, pagination, caching, streaming and compatibility. Uses professional API/network knowledge on demand.
---

# API and network contract design

**Trigger:** an important API endpoint or protocol change, new provider/client integration, long-running command, pagination, versioning, cache behavior, SSE/WebSocket or request failure semantics. Not a routine field rename.

1. Read the relevant approved **product action** and technical owner, then the actual API route, consumer and application operation from [code navigation](../../../docs/engineering/code-navigation.md). Code is evidence, not permission to rewrite intended semantics.
2. Activate the appropriate sections of [API and network contracts](../../knowledge/api-and-network-contracts.md). For ownership/privacy add [security](../../knowledge/security-and-trust.md) *only* if that boundary matters. Compare resource REST, command HTTP, typed RPC, GraphQL or event interfaces based on real consumer needs.
3. Define resource/business intent identity, HTTP/wire semantics, what success/acceptance actually proves, timeouts/cancellation, conditional writes, idempotency and permitted retries. Identify at least one plausible alternative and which constraint would reverse the design.
4. Specify request/response/error shape, serialization (time, null, money, versions), authz scope, pagination/streaming/cache semantics, rolling upgrade compatibility and reasonable resource bounds. Do not invent an API-wide versioning system for a small change.
5. Produce a compact acceptance/consumer contract, including success, denied/conflict, stale/duplicate, and one transport/proxy-related case if material.
6. Handoff to Cursor only after approved technical owner. No code editing, live provider calls, database reset or server startup in design/review role.

**Output:** `consumer outcome | options and criteria | authoritative operation | wire/status/lifecycle | compatibility and security | one falsifying test | source anchors and remaining decision`.
