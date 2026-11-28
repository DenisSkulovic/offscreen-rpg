# OBS-E2-10 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `install.mjs`: `runObservabilityPlan`, `runObservabilityStatus`, `runObservabilityEnsure`, `helmInstallArgv`, `verifyCompletedPhasePrefix` currently use historical variant and prefix contract.
- `connect.mjs`: `collectObserved`, `runObservabilityConnect` classify historical desired and later forward/admin UID checks; `forward.mjs`: `openForwards`, `probeForwardTransport`, `readGrafanaAdmin`.
- `infra/environments/infra-cli.mjs`: `observabilityReadinessToServiceState`; `platform-plan.mjs` native obs plan/render/lint and worker admission; `infra/platform/common/cli.mjs` `renderObservabilityDocuments`; `infra/verification/diagnostic-live.mjs` observation caller. INTEGRATION operation matrix.
- CLI01 `scripts/repo-tools/offscreen.mjs` delegates existing commands; leave public CLI wrapper unchanged.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
