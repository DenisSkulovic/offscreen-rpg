# Engineering gap audits

Source-grounded comparison **against a previously defined target**, never code-smell scavenging. Audit claims carry their inspected revision and verification limits.

| Area | Target-first specification | Source audit | Verification |
| --- | --- | --- | --- |
| Developer Chamber | [C01–C16 target](../targets/chamber-laboratory.md) | [November 12 Chamber audit](chamber-gap-2026-11-12.md) | 5 scripted scenes, 15 QA cases, inspector, launcher and integration test source inspected; no runtime tests |
| React 19 / Next 16 selected destination | [F1–F15 target](../targets/react-next.md) | [November 12 expanded audit](react-next-gap-2026-11-12.md) | GitHub source/contract/test/CI inspection only; no runtime/build |
| React / Next historical | [Same target, F1–F10 originally](../targets/react-next.md) | [November 11 initial audit](react-next-gap-2026-11-11.md) | Historical source inspection only; prior scope retained for provenance |

The November 12 audit now includes **G27–G33 architecture adoption gaps** for TanStack Query, RHF, SSE, Storybook and supporting security/receipt contracts. A positive source observation is not a reproduced browser result; a missing test or uninstalled chosen library is not itself a reproduced user bug. Use the [Change queue](../../changes/README.md) to select a code-bearing unit only with owner approval. A good audit can conclude that no code change is justified.
