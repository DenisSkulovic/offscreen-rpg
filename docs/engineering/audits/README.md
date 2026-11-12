# Engineering gap audits

Source-grounded comparison **against a previously defined target**, never code-smell scavenging. Audit claims carry their inspected revision and verification limits.

| Area | Target-first specification | Source audit | Verification |
| --- | --- | --- | --- |
| React 19 / Next 16 current planning | [F1–F15 target](../targets/react-next.md) | [November 12 expanded audit](react-next-gap-2026-11-12.md) | GitHub source/contract/test/CI inspection only; no runtime/build |
| React / Next historical | [Same target, F1–F10 originally](../targets/react-next.md) | [November 11 initial audit](react-next-gap-2026-11-11.md) | Historical source inspection only; prior scope retained for provenance |

A positive source observation is not a reproduced browser result; a missing test is not proof of a bug. Use the [Change queue](../../changes/README.md) to select a code-bearing unit only with owner approval. A good audit can conclude that no code change is justified.
