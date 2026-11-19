# BOOT02 | Composer route: pinned S3 fixture already partly proven

**Baseline:** 584b594. **State:** Implementing: local importer and second-Pod reader actually ran; no game uses the imported objects yet. **Default model:** Composer Standard, VERIFY/documentation. **Do not rebuild a new bootstrap subsystem.**

**Confirmed current source:** `scripts/repo-tools/import-pinned-fixture.mjs`, `read-pinned-fixture.mjs`, importer tests; `infra/kubernetes/lab/content-bootstrap/{importer-job,reader-job,smoke}.yaml/.sh` and runbook. The importer pins known Seyda Neen world `5b37ec63…5ec9`, rules `d643427f…d7ab`, start `e30eaa27…e3787d8d2813`; checksums/symlink/missing dependency fail without overwriting prior fixture-pin.json. Existing second Pod read the same exact S3 objects after importer Pod deletion; that is **not a successful opening candidate**.

## T01 | Repeat safe no-cluster proof | PLANNER-READY
Read importer script/tests and `docs/runbooks/kubernetes-content-bootstrap.md`. Run the pure local fixture tests and recorded hash compare; **not** a real S3 smoke unless explicitly selected by cluster operator. Positive: matching three pinned objects and unchanged repeat import. Negative: bad checksum, symlink or missing dependency fails before changing pin. No game rows.

## T02 | Integration handoff without duplicate work | PLANNER-READY, DOC
Record exact manifest references and namespace/bucket/reader path to BOOT03/TURN02; ensure release imports once, API runtime reads exact pin **without local content directory**. Only BOOT03 creates an owned candidate and starts story. If old receipt already meets BOOT02's accepted Pod case, use its evidence and run required `wiki:change-guard` plan/close before any Ready/Done promotion; never label new game evidence.

## T03 | New Pod test only on changed source | CONDITIONAL
If source or image changed since the recorded 2026-11-19 proof, one selected lab operator may repeat the two-Job read after safe preflight, recording image/cluster UID, hashes and missing-object denial. No auto cluster create/delete under Cursor child, no model call. **No Grok required.**
