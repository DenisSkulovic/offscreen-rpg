# Target information architecture | from linked pages to dependable knowledge

**State:** Proposed redesign, not new game truth. Keep product/technical authority hierarchy, existing graph/search and Change workflow. Improve the *meaning of sections and relations* and explicitly map missing knowledge.

## A. Two independent axes for any retrieved section

1. **Normative authority:** selected product / selected technical / explicitly proposed / historical example / source map / status evidence / unclear.
2. **Realization:** implemented and inspected, tested in fixture, live observed, unimplemented target, proposed code, unknown.

A page can contain both selected and proposed sections. Retrieval must classify **the section**, not infer authority from file location or page preamble. Use deterministic section-local status where explicit, inheritance only where safe, and a clear \`unknown/mixed\` label otherwise. A substring mentioning “proposed” in a description of something else is **not** enough to downgrade the governing paragraph. Maintain negative controls.

When a section's authority cannot safely be inferred, the system should present its exact text and source path with an explicit uncertainty, not silently route it as normative. A selected target may remain unimplemented for years without becoming a proposal.

## B. Three navigation layers rather than giant directory lists

- **Question router:** \`docs/README.md\`, \`docs/product/README.md\`, \`docs/technical/README.md\` remain concise task-oriented index maps, not mirrored specifications. Expose currently indirect owners when consequential (API, retention, protocol, caching).
- **Claim route:** an in-context link to the exact governing heading, with one-line rationale. For genuine risk, a typed \`constrained-by\` / \`depends-on\` / \`co-change\` edge on the dependent claim. Ordinary links and evidence citations stay non-binding.
- **Task route:** a bounded guide/runbook that answers **how to author, integrate, test, recover or operate safely**, linking back to the product/technical authority rather than copying it.

The task route is the main missing type in the current wiki. It must be actionable with preconditions, negative “do not” boundaries, and actual safe proof tier.

## C. Documentation architecture can change shape, not just wording

For any material documentary Change, design one or more of:

| Operation | When warranted | Required conservation |
| --- | --- | --- |
| **Create** | A repeated important reader question genuinely lacks a single owner and cannot be answered from a modest existing section | Assign purpose, authority type, source links and responsible maintainer; protect unrelated existing claims |
| **Rewrite** | Correct owner, unclear or contradictory claims | Before/after meaning matrix and adverse interpretation test |
| **Split** | Two topics differ in audience, owner, revision cadence or permissions and cannot be retrieved cheaply together | Map each old heading/anchor to a new owner, rewrite inbound links, preserve unique claims and historical citations |
| **Merge** | Competing canonical pages answer the same question with subtly different authority | Decide one winner, keep unique constraints/counterexamples and repair all backlink routes |
| **Move** | A document answers a different authority-tier or audience question than its folder represents | Confirm it does not promote proposal to selected or move evidence into norm |
| **Retire** | No longer normative; no unique decision/needed history in active owner; replacement exists | Record canonical successor or explicit supersession, prevent archived content from being interpreted as current |
| **Reviewed unchanged** | Page already coherent and linked; no substantive value in editing | Record why, including relevant dependencies |

A Change packet's P/T/C/Related plan must name **file operations and material heading migrations** when applicable. The executor should not independently merge articles and assume checked links certify meaning conservation.

## D. Coverage discovery loops

When a new source module, public API, data model or proposed product behavior changes:
1. Ask which human/agent task or product decision it introduces.
2. Inspect current product/technical claims and code/source map for that task.
3. Return one of: **already covered** (exact heading), **add section**, **create new canonical owner**, **create proposed design pending decision**, **add how-to/runbook**, **record no-doc reason**.
4. For every new owner, identify which old page's scope it removes, if any; avoid parallel conflicting truth.
5. Evaluate a concrete question that should route to the new owner and a question that should *not*.

The coverage review must find missing document **types** as well as omissions inside existing text. An agent cannot infer from 81/81 reachable that the needed 82nd page is unnecessary.

## E. Defensible relationship coverage

Typed dependencies should be driven by **causal invariants** rather than page-count quotas. Prioritize:
- product consent and action permission -> engine admission/clock;
- mechanics applicability -> supported effects and world package rules;
- Storyteller no invented canon -> prompt/tool/result validation;
- saved source revision -> publication/history/client appearance;
- owner/member identity -> HTTP/Admin reads;
- spend/funding/uncertain provider outcome -> Storyteller dispatch and recovery;
- evidence provenance -> staff read/retention and telemetry separation;
- story deletion/privacy -> derived artifacts, backups and forensic retention when decisions are ratified.

Initially implement a small reviewed dependency *neighborhood* each packet, with a target of **zero missed known material dependent claims on its hand-built fixtures**, not “five links per article”. An incomplete graph declares blind spots and reports unknown source/heading boundaries rather than claiming full safety.

## F. Search and proof

The existing \`wiki:find\` / \`wiki:read\` should remain deterministic and inexpensive. Improve exact section authority, query vocabulary/examples, heading precision and supporting citation trace; do not adopt embeddings simply because lexical queries miss a synonym. The generated portable index should reflect the same authority and report mismatches as migration findings.

Held-out tests must include tasks that **do not have a ratified answer** and tasks where the correct answer is **stop/ask owner**, not choose code or invent a rule. Measure: correct owner@k, selected/proposed classification, negative constraint recall, expected dependent recall, source/status attribution, steps/bytes read and false positives. Keep answers independently reviewed, no benchmark-key leakage into ranking.

## G. Do not overbuild

No universally mandated “feature.md per API”, no double-authored endpoint registry, no automatic “one document per class”, no page age as proof of staleness, no grep-mining for unapproved product requirements, no semantic vector pilot without measured local failure. A world without coordinates is not missing map tech by default; a speculative privacy page is not an enacted deletion policy.
