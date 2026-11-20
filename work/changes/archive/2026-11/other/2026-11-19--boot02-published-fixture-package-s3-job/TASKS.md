# BOOT02 | Composer route: pinned S3 fixture already partly proven

**Baseline:** 584b594. **State:** Implementing: local importer and second-Pod reader actually ran; no game uses the imported objects yet. **Default model:** Composer Standard, VERIFY/documentation. **Do not rebuild a new bootstrap subsystem.**

**Confirmed current source:** `scripts/repo-tools/import-pinned-fixture.mjs`, `read-pinned-fixture.mjs`, importer tests; `infra/kubernetes/lab/content-bootstrap/{importer-job,reader-job,smoke}.yaml/.sh` and runbook. The importer pins known Seyda Neen world `5b37ec63…5ec9`, rules `d643427f…d7ab`, start `e30eaa27…e3787d8d2813`; checksums/symlink/missing dependency fail without overwriting prior fixture-pin.json. Existing second Pod read the same exact S3 objects after importer Pod deletion; that is **not a successful opening candidate**.

## T01 | Repeat safe no-cluster proof | VERIFY PASS (2026-11-20)

**Command:** `node --test scripts/repo-tools/import-pinned-fixture.test.mjs` — **5/5 PASS** (no cluster, no importer source edits this slice).

**Positive:** Pinned roots match recorded Seyda Neen fixture: world `5b37ec63…5ec9`, rules `d643427f…d7ab`, start `e30eaa27…2813` (`e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813`). Repeat import leaves `fixture-pin.json` unchanged. No game rows, no campaign, no opening candidate.

**Negative:** Wrong checksum, symlink, or missing dependency exits non-zero and leaves the prior pin file bytes unchanged (same three cases as TASKS header and importer tests).

**Not run:** [T03](#t03--new-pod-test-only-on-changed-source--conditional) live S3/Pod — no cluster operator selection this slice; prior 2026-11-19 Pod proof remains the cluster tier.

**Guards:** Packet-local documentation receipt only; Change stays open; `pnpm wiki:change-guard --mode close` NOT-RUN for Done promotion (same condition as [T02](#t02--integration-handoff-without-duplicate-work--doc-receipt-2026-11-20)).

## T02 | Integration handoff without duplicate work | DOC RECEIPT (2026-11-20)
**Result:** Recorded exact manifest references, namespace, bucket, S3 endpoint, importer/reader entrypoints, and the three pinned root hashes in [kubernetes-content-bootstrap.md](../../../../docs/runbooks/kubernetes-content-bootstrap.md#integration-handoff-boot03-turn02), with downstream boundaries for [BOOT03](../2026-11-19--boot03-game-authority-start-admission/TASKS.md) and [TURN02](../2026-11-19--turn02-compose-real-kubernetes-application-release/TASKS.md). Cross-links added in those packets' SOURCE-MAP files.

**Evidence reused (not new):** 2026-11-19 second-Pod read after importer deletion — importer uid `1d177268-8810-4b3f-aad1-55008659034a`, reader uid `b23c0b53-6741-49ab-ae13-ae3e922da128`, bucket `lab-objects`, hashes as in TASKS header; full receipt in the runbook [Observed local run](../../../../docs/runbooks/kubernetes-content-bootstrap.md#observed-local-run). No new game, campaign, or story-start evidence.

**Boundaries stated:** Release imports the fixture once (TURN02); API/GA runtime reads the pinned manifest roots from S3 without a local `content/` directory (TURN02 T01). Only BOOT03 creates an owned opening candidate and commits story start.

**Guards:** `pnpm wiki:change-guard --mode plan` ok on this packet (2026-11-20). `--mode close --base 584b594` NOT-RUN for promotion: unrelated in-flight source paths in the working tree inflate the diff (undeclared-path errors). Re-run close on a BOOT02-only commit or clean tree before Done. Packet stays open; not Done.

## T03 | New Pod test only on changed source | CONDITIONAL
If source or image changed since the recorded 2026-11-19 proof, one selected lab operator may repeat the two-Job read after safe preflight, recording image/cluster UID, hashes and missing-object denial. No auto cluster create/delete under Cursor child, no model call. **No Grok required.**
