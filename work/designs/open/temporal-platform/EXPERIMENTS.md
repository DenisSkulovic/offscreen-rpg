# Manual evidence sequence

Design-only experiments, operator runs in WSL and supplies redacted outputs; ChatGPT interprets each result before the next step. No Cursor, no Change folders, no implementation commission. Existing Temporal folder remains excluded until explicit permission. Do not read Secret data, mutate databases, install Helm releases, delete resources or restart workloads in the first stages.

## E1: local source and chart artifact

From repository root, inspect git branch/HEAD/status; do not reset or overwrite any work. Fetch main and use git show origin/main:<path> into a fresh temporary directory if local checkout contains unrelated changes. This avoids merging anything merely to inspect the specimen. Check helm version, curl and sha256sum. Fetch exact published chart URL from specimen/chart.pin, compare SHA-256 against pin; stop on failure. No cluster access.

## E2: offline Helm rendering

Use same verified archive and exact specimen files, helm lint and helm template for both profiles; save generated output in temporary directory. Render does not install or query cluster. Review actual objects and names, resources, ports, probes, schema Job init containers and Secret references, configuration, namespace setup, and absence of public listeners/bundled DBs. Inspect Helm user-values composition and image tag+digest rendering if necessary. No generated YAML committed as desired source. Report actual output, not predictions.

## E3: narrow PG evidence (read-only, separate instruction)

After E2, inspect actual contexts, namespace and CNPG resource identities, installed CRD capabilities, existing PG provisioning owner and relevant status. Only explicitly scoped metadata, no Secret contents or unrelated data. Establish whether two retained DB declarations and narrow credential preparation suffice; no tuning. Decide whether persistence deserves independent Change.

## E4: transition inventory (permission required)

Only after owner explicitly lifts existing Temporal folder exclusion for retirement inventory, map old files/callers/tests and live legacy topology. No architecture copied from old code. Read-only runtime observations subject to explicit target and permission; capture identities, versions, persistence, shard count, namespace retention and workflow state without exposing protected payloads. Select fresh authorized disposable initialization or preserve/migrate per environment. No assumption that replace source means delete data.

## E5: operations and proof

Use small local subprocess fixtures for lock/timeout behavior if needed; inspect actual Helm get values and health CLI semantics on approved target. Freeze exact caller maps, release namespace policy and fixture contracts. Record evidence and revise design. Only after owner review, prepare actual Change packets. Live install/cutover is separately authorized later.

Current next step E1 only. Do not automatically continue into cluster operations. Every result is evidence with PASS/FAIL/NOT RUN, not progress percentages.
