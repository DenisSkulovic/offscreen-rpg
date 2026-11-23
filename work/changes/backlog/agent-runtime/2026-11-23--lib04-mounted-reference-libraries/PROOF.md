# LIB04 | Acceptance ladder; planner-held until caller/security map completed

**A source adapter unit/integration proof:**
- Two pinned world/rule sources plus the Story Library, overlapping `lore.md` paths distinguishable by mount alias; exact root and manifest identity validated.
- Unknown alias, forged root, wrong revision/engine, corrupt manifest, wrong object envelope, missing object and out-of-budget requests fail closed.
- Private entries not present in browse/find, title/count/cursor/read or errors for actor lacking grant; revocation between calls denies next operation.
- >128 path Story Library test returns later visible records through cursor traversal; first page all private still yields safe continuation; cursor mismatch across alias/root/grant/prefix rejected.
- Global max inspected entries, total bytes and per-read character cap; `readByObjectHash` has mandatory source-root membership.
- No SQL, no extra node/service, no provider call, no cache. Existing v1/v2 story-only navigation and tests unaffected.

**B writer mission/product proof (distinct acceptance):**
- New v4 capture round-trips across GA/task/custody/worker/replay with exact source/grant fingerprint and deterministic hash; legacy v1/v2/v3 fixture bytes and hashes unchanged.
- Granted `shelf.browse/find/read` returns per-source citation, ungranted/foreign/root override/capability elevation all denied; model cannot attach shelf.
- Citation against wrong mount, wrong document/hash, invalid section or developer-private source rejected before publish. Quoted source is not converted into story canon automatically.
- Actor loses access after mission capture: all further reads fail; replay doesn't use stored grant as bypass; historical source provenance retained without exposing redacted content.
- Result/attempt byte budgets and host financial limits continue to constrain tool loop; no fake provider spend/live cross-Pod PASS.

**Readiness gates before B:** exact all producers and consumers of capture schema, SQL persistence/replay, event and Temporal boundary, authorization service and revocation data source, citation save/publish and tests mapped into executable T-ID source anchors. Current packet is therefore not authorized as implementation work. A can be promoted into a separate bounded Change only after source current-HEAD check and targeted spec authority accepted.
