# OBS-E2-11 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `custody.mjs`: `classifyPending`, `inspectPendingRecord`, `validateStoredUpgrade`, `createHandle`, `acquireCustody`, `runMutation`; legacy pending operation `upgrade` / `collector-upgrade`.
- `upgrade.mjs`: `main`, `runObservabilityUpgrade`, `helmUpgradeArgv`, `projectUpgradePreservation`, `upgradeHistoryPreserved`, `stableResourceVersions`, `relaySha256`; historical Collector only.
- `forward.mjs`: `openForwards`, `probeForwardTransport`, `readGrafanaAdmin`; existing synthetic primitives `infra/verification/smoke/observability/{signals,signal-probe,developer-probe,disruptions}`. Reuse bounded primitives inside owned session; no top-level proof acquisition. INTEGRATION occupied sequence, final/phase history matrix and M03.
- Group pending contract freezes exact version/operation semantics; new E2 upgrade code consumes existing identity/mutation supervision and 09 verifier, not raw kubectl.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
