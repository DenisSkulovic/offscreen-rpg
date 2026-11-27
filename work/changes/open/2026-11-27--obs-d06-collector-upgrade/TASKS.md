# OBS-D06 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Preservation projection and admission | PLANNER-BLOCKED

Anchors planned upgrade.mjs, P/readiness.mjs::classifyInventory, snapshot-fixtures.mjs, host-probe.mjs::MIN_HOST_MEMORY_MIB/parseMeminfoMiB. Read EXECUTION § Admission. Write upgrade/test. Fixed argv/auth before host, bounded 4096 memory check, exact predecessor/current, strict projection; missing/changed claims/UID/history/Secret, invalid memory or target refuse. Root node --test infra/platform/observability/tests/upgrade.test.mjs.

## T02 | Guarded transition and terminal checks | PLANNER-BLOCKED

Requires T01. Anchors P/custody.mjs::runMutation, P/readiness.mjs::verifyOwnedFinalShape, P/forward.mjs::openForwards, EXECUTION § Transition. Write upgrade, exact upgrade validator/phase in custody.mjs (required; D03 refuses upgrade), tests and package script. Durable exact intent; single upgrade, close, expected rev2, no old active Pod, preserved projection and transport before compare-clear. Current no-op double read; timeout/abort/foreign pending/failed transport retains fence. Root node --test infra/platform/observability/tests/{upgrade,forward,readiness,custody,install,receipt}.test.mjs.
