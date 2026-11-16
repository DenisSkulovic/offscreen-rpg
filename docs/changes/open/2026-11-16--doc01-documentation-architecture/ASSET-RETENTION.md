# DOC01 | Non-Markdown asset retention (P1)

**Pinned HEAD for hashes:** working tree on `docs/doc01-architecture` (files unchanged since baseline for these paths).  
**Rule:** no delete until consumer + privacy review; retained assets get manifest + hash.

| Path | SHA-256 | Class | Consumers found | Retention decision |
| --- | --- | --- | --- | --- |
| `docs/programs/experience/evidence/renders/ux01-story-frame-1440.png` | `1C60CF67BCC688F52EBC96929AC02F0059A1A90C244CA44442D6A72127657B24` | visual evidence / portfolio render | DOC01 registers only (no test path hit by name) | **RETAIN** → `evidence/inspections/ux01/` or test snapshot if a regression harness adopts it; not a live usability proof |
| `docs/programs/experience/evidence/renders/ux01-story-frame-375.png` | `00D422B2954BCA2D8541F81FA6AAC3ADE021BF4E25EA520FA6E27B4552679A8B` | visual evidence (mobile width) | same | **RETAIN** with sibling above |
| `docs/programs/observability/evidence/assets/obs07-support-situation-synthetic.png` | `A8DF32DDEB291FCDADBC699F135F7198D0112E2F45C14B9105743537B5B99D90` | synthetic UI screenshot | `docs/programs/observability/evidence/obs07-support-situation-ui-2026-11-15.md`; **writer:** `tools/api-integration/test/admin-control-ssr.integration.ts` (path `docs/observability/evidence/assets/` — drift) | **RETAIN** as synthetic illustration under `evidence/runs/…/assets/`; label **not** live Support UX validation; fix writer path in P5 |
| `…/S1-CAMPAIGN-IDS.json` | `8B9B373279A194F24E09E4ADFDB84BB6C3F051AB964CB0FDDB10644F4DB88748` | trial reproduction IDs | forensic CHECKPOINT/FINAL-HANDOFF/RUN-LOG; independent review; **writer:** `tools/chamber/src/main.ts` → `docs/observability/evaluations/…` (drift) | **RETAIN** under `evidence/runs/2026-11-15--connected-forensic-trial/`; P5 retarget chamber writer |
| `…/S2-LEDGER.json` | `23E708E85C610B60C9CCEBCB9E64B64B1AE5C8C56D2A013220A8E9590BF76CAC` | trial ledger | same evaluation packet | **RETAIN** with run manifest |
| `…/S3-FAULT-MATRIX.json` | `056CD5DC62EE6AC5B563B465B3F286CE6627E82337F5EEB72753E6D4622256D6` | negative fault matrix | same | **RETAIN** — unique negative evidence; do not drop |

**Privacy:** assets are synthetic/lab or chamber disposable IDs; no raw user narrative payloads identified in this pass. Re-check JSON bodies before any public mirror.

**Drop forbidden until:** P4 evidence run manifest exists and P5 writers no longer depend on old paths.
