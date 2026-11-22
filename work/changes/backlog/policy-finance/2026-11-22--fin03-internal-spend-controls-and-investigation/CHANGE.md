# FIN03 | Internal provider spend control, discrepancy investigation and reporting

**Status: PROPOSED, NOT CURSOR-READY.** Future internal Admin/Finance/Ops projection and incident workflow, not a new billing ledger or player-facing subscription dashboard.

## Owner outcome

An authorized operator can inspect financially relevant provider consumption across provider, payer, account, task, story, time period, model, unit and currency, with an explicit distinction between **estimated reservation, provisional usage, settled internal consumption, reconciled vendor expense and outstanding unknown liability**. The owner wants protection against unpredictable third-party spending and ability to investigate every material discrepancy, even when provider dashboards lag.

## Proposed operational surfaces

- Safe summaries and drilldowns to exact operation/attempt and provider evidence ID; timeline from admission → send → usage received → provider invoice/export → matching/adjustment/dispute. Different monetary units/currencies and optional provider-native usage recorded without pretending to the cent when evidence is aggregated/unavailable.
- Alert thresholds for anomalous spend, leaked usage, unknown-liability age, reconciliation mismatch, provider price drift, unusually expensive model/image requests, quota/budget exhaustion, exploding retries and account/platform limit pressure. Alerts are signals; **only existing authorized GA funding/dispatch gates** enforce spending. An operator dashboard or reconciliation import cannot bypass them.
- Role-specific visibility: Finance/authorized Engineering can see necessary provider/native cost evidence and internal route IDs; Support receives safe account eligibility/incident status; Business gets aggregated cohorts/cost-of-service, not customer prompts. Audit every privileged drilldown and financial adjustment; never expose secrets or raw model bodies in spend views.
- Human-controlled resolution cases for missing/mismatched provider evidence, corrections/credits and uncertain sends, with dual-control for substantial liability changes where later appropriate. No automatic write-off of ambiguous charges, provider balance polling as a mandatory hot-path, or automatic customer refunds/top-ups.
- Reuse existing `@offscreen/admin` `commercial.usage.read` and `platform.spend.read` **as narrowly currently defined**, not blanket new raw billing permission. Create separately scoped reconciliation/adjustment capabilities if required after source review. Existing [ADI03](../../experience-admin/2026-11-22--adi03-effective-policy-history-explorer/CHANGE.md) owns **why a scene received its model/config**; FIN03 owns actual vendor money and discrepancy resolution.

## Minimum proof

Synthetic provider statements with a late correction and an unmatched aggregate line reconcile into an auditable investigation; summary totals equal detailed allocations plus explicitly unallocated differences. Cross-account views respect capabilities; player-facing endpoints expose no internal supplier cost. Unknown or missing data shows `unreconciled`, not zero cost. Provider API access or real accounts aren't necessary for first implementation.

**Dependencies:** FIN01 reconciler, FIN02 provider unit normalization, existing funding ledger, Admin permissions and eventual commercial billing decisions. No payment processor, tax engine, user invoice UI, bank charges, paid calls or implementation authorized.
