# Provider dispatch review gate

Status: agreed direction; implementation active.

## Intended outcome

Run real gameplay through complete Storyteller preparation while stopping before provider I/O. Inspect and compare the exact credential-free packet, then either reject it, rebuild after improvements or explicitly release that one immutable packet through all existing authority and budget checks.

This makes dry runs useful product/engineering evidence and ensures the first paid request leaves enough trace material to analyze context quality, prompt structure, model behavior, cost and resulting gameplay.

## Acceptance

- Dry-run gameplay constructs the exact body the adapter would send and incurs no reservation, attempt or network call.
- Packet inspection exposes hashes, byte contributions, provenance, route/limits and honest unknown token facts.
- Optional hold mode persists across worker delivery/restart and cannot be bypassed by another delivery.
- Release applies only to the reviewed packet and rechecks freshness, authority, funding and spending windows immediately before dispatch.
- Reject/rebuild/release are separately auditable; editing a captured packet is not supported.
- One real response links back to its reviewed packet, validation, accounting, publication and human QA evidence.
- Ordinary tests, startup and offline gameplay cannot enable or release provider work.

## Boundaries

This is developer/evaluation infrastructure, not a player approval screen, prompt CMS, general workflow debugger or standing permission to spend. It introduces no live call by itself.

