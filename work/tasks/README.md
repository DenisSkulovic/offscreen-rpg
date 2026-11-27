# Standalone Tasks | action/verification catalog

**Place vs lifecycle:** [Repository structure](../../REPOSITORY-STRUCTURE.md#4-work-is-temporary-coordination-not-product-truth). A standalone Task is an independent operational action/receipt, not a microtask inside a Change and not a lasting implementation diff.

**Purpose:** independently tracked operational work that can finish with a run receipt and **no intended lasting code or normative-document diff**. Selection is owned by [work/QUEUE.md](../QUEUE.md); this is a catalog and lifecycle index. [Work taxonomy](../WORK-TAXONOMY.md) · [Task template](TEMPLATE.md).

| Collection | Purpose |
| --- | --- |
| [open/](open/README.md) | Proposed, Ready, In-progress or Blocked standalone Task packets, each `<leaf>/TASK.md` |
| [archive/](archive/README.md) | Done/Cancelled Task packets with links to durable evidence |
| [TEMPLATE.md](TEMPLATE.md) | Minimal exact, safe, Composer-friendly run contract |

DXK-FINAL cancelled and [archived](archive/2026-11/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md) 2026-11-27; no execution or PASS. Current infrastructure acceptance belongs to its existing owners.

**No standalone Tasks selected at adoption (2026-11-20).** Do not create or select an empty placeholder Task for every Change-owned test or Composer `Txx`. Existing Change-owned work remains [under Changes](../changes/README.md).

Use a new standalone Task only when separate selection, timing, an operator/environment gate, recurrence or a durable evidence receipt genuinely matters. Running a targeted test as part of a selected code Change does not normally require one. A Task may invoke an existing scripted experiment; **implementing** the script, SQL schema or reusable tool is a Change.

Create `open/YYYY-MM-DD--short-slug/TASK.md` based on [the template](TEMPLATE.md), link it from the [open index](open/README.md), and select its precise packet from [work/QUEUE.md](../QUEUE.md) only with owner approval. After actual result/reconciliation, archive the packet under `archive/YYYY-MM/<leaf>/TASK.md` and update the open/archive indexes and evidence references. Preserve failures, blocked prerequisites and meaningful no-op receipts; never archive merely because a CLI returned zero.
