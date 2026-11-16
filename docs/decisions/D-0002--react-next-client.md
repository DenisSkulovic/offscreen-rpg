# D-0002 | React, Next.js, TanStack Query

**Date:** 2026-11-12 owner decision, recorded 2026-11-16.  
**Acceptance:** accepted stack for the client engineering campaign.  
**Norm:** [client architecture](../technical/client/architecture.md), [state boundary](../technical/client/state-and-server-boundary.md).

## Choice

Next.js App Router with server-rendered private reads, TanStack Query as the only remote-data cache, React Hook Form and Zod for edits, and authenticated SSE as an invalidation hint plus HTTP GET for truth.

## Rejected

A second client store for the same story. Persisted private query caches. WebSockets or Redis pub/sub as the player update bus. Optimistic committed game outcomes.

## Revisit

Library substitutions are not an open menu for implementation agents. A hosted Chamber for non-developers would be a separate authorization decision, not a reversal of this stack.
