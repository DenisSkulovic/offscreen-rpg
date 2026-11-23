# CACHE02 | bounded Composer tasks

One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Lifecycle

- Initial anchors: packages/cache/src/index.ts; packages/cache/package.json.
- Decided edit and proof: Extract redis-connection with injected client factory, configured/disabled states, one reconnect owner, startup budget, no offline queue. Fake client initial failure then recovery, terminal close.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Command admission and breaker

- Initial anchors: packages/cache/src/index.ts; packages/cache/src/runtime/redis-connection.ts.
- Decided edit and proof: Redis byte store atomic PX envelope; actual pending cap, bounded SDK queue, supported abort, retain pending until settled, no blind resend. Breaker five failures/5s/one probe. Test slow outstanding command, saturation, timeout, malformed envelope, refusal, half-open race, shutdown destroy.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T03 | Compatibility

- Initial anchors: packages/cache/src/index.ts; packages/cache/src/adapters/redis-store.ts; apps/api/src/app.ts.
- Decided edit and proof: Preserve legacy API and JSON wire while migrating via same transport; safe incident mapping/config defaults. Test throwing telemetry and configured vs ready.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Parent owns shared manifests/lock. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
