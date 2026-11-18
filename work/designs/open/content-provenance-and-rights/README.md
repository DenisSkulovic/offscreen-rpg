# Content provenance and rights

**Status: Proposed. Not selected.** This page is an open design. It is not a product rule, not a technical contract, and not permission to publish. Owner review is required. Legal review is required before any policy is selected. No license is adopted. No takedown policy is adopted. No hosting promise is adopted.

**Reader question:** Which content sources and attribution records already exist, which publication questions are still open, and which stored provenance fields can be kept without granting a right to redistribute?

**Unique owner of that question:** this inventory. SRD attribution text stays on [NOTICE.md](../../../../NOTICE.md#rules-attribution). Mechanical promises stay on [Gameplay rules](../../../../docs/product/gameplay/rules.md#foundation). Package authoring stays on [Content package authoring](../../../../docs/runbooks/content-package-authoring.md). Import, pins, and campaign provenance stay on [Canonical documents and packages](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap). Fiction limits, ratings, and bans stay on [Content policy](../gameplay-domain-coverage/README.md#content-policy) and [What it must not do](../../../../docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do).

## Known sources

These rows were read in the worktree while HEAD was `b3113814`. NOTICE.md, the SRD subset, the Vvardenfell files, the Seyda Neen start descriptor, and the `/rules` page were unchanged at that commit. A file's presence is not a license. No license is inferred from a path, a title, or a fictional name.

| Source | Exact path | Attribution record that is actually in the file |
| --- | --- | --- |
| Rules attribution | [NOTICE.md](../../../../NOTICE.md#rules-attribution) | States that this work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd, and that the SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode. Names project-specific extensions and says the application exposes the same attribution at `/rules`. |
| Public rules page | [apps/web/app/rules/page.tsx](../../../../apps/web/app/rules/page.tsx) | Repeats that SRD 5.2.1 and CC BY 4.0 attribution paragraph. This inventory does not edit the page. |
| SRD subset orientation | [content/rules/srd-5.2.1-subset/RULES.md](../../../../content/rules/srd-5.2.1-subset/RULES.md) | "Rules derived from SRD 5.2.1 are used under CC BY 4.0. Project-specific time, event and activity policies are identified on their pages." |
| SRD subset descriptor | [content/rules/srd-5.2.1-subset/rule-package.json](../../../../content/rules/srd-5.2.1-subset/rule-package.json) | `license.name` is "Creative Commons Attribution 4.0 International". `license.source` is `https://www.dndbeyond.com/srd`. `license.attribution` is "System Reference Document 5.2.1 by Wizards of the Coast LLC". |
| Vvardenfell sample | [content/worlds/vvardenfell-poc/WORLD.md](../../../../content/worlds/vvardenfell-poc/WORLD.md), [locations/seyda-neen.md](../../../../content/worlds/vvardenfell-poc/locations/seyda-neen.md), [locations/census-and-excise-office.md](../../../../content/worlds/vvardenfell-poc/locations/census-and-excise-office.md), [routes/seyda-neen-to-balmora.md](../../../../content/worlds/vvardenfell-poc/routes/seyda-neen-to-balmora.md) | No license, copyright, or attribution sentence is in these four files. There is no `world-package.json`. |
| Start pin for that sample | [content/starts/seyda-neen-prisoner/start-package.json](../../../../content/starts/seyda-neen-prisoner/start-package.json) | Pins the world id, root hash, revision, and mount `vvardenfell`, and pins the SRD subset ruleset by id, root hash, revision, and engine. The descriptor has no `license` key. |

The SRD attribution in NOTICE.md and in the rule-package `license` object names SRD 5.2.1. It does not cover the Vvardenfell sample or any other fictional setting.

Rule pages inside the subset, and the sentence each page already uses:

| Page | Sentence in the file |
| --- | --- |
| [checks/ability-checks.md](../../../../content/rules/srd-5.2.1-subset/checks/ability-checks.md) | Adapts the ability-check foundation of SRD 5.2.1. The current-form applicability boundary and admitted-modifier policy are Offscreen rules. |
| [checks/advantage-and-disadvantage.md](../../../../content/rules/srd-5.2.1-subset/checks/advantage-and-disadvantage.md) | Adapts advantage and disadvantage from SRD 5.2.1. |
| [checks/event-occurrence.md](../../../../content/rules/srd-5.2.1-subset/checks/event-occurrence.md) | Occurrence checks are distinct from SRD-style ability checks and are an Offscreen mechanic. |
| [activities/contribution.md](../../../../content/rules/srd-5.2.1-subset/activities/contribution.md) | The contribution lifecycle is an Offscreen extension. Its embedded ability check uses the SRD-derived check rules in this package. |
| [time/committed-time.md](../../../../content/rules/srd-5.2.1-subset/time/committed-time.md) | Describes Offscreen time policy rather than an SRD rule. |
| [authority/storyteller-and-engine.md](../../../../content/rules/srd-5.2.1-subset/authority/storyteller-and-engine.md) | This page contains no SRD attribution sentence. |

[Executable library shape](../../../../docs/product/gameplay/rules.md#executable-library-shape) already requires that imported rule material be licensed for the product or privately supplied by an authorized user, with source and license provenance retained. That sentence stays on the rules page. It does not choose a distribution license for a world sample, for generated media, or for a third-party setting.

[Content package authoring](../../../../docs/runbooks/content-package-authoring.md) already says checked-in samples do not approve a license, do not grant rights in the SRD text, and do not grant rights in the Vvardenfell sample. It also says the sample `license` object records a name, a source URL, and an attribution string, and that recording those fields is not legal approval. This inventory does not add a second link there.

## What a record stores

Package provenance can be recorded while publication rights stay undecided. "Publish" in the package importer means content-addressed storage of a new immutable root. [Campaign bootstrap](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap) says import publishes an immutable package manifest and does not create a campaign or schedule an obligation. That storage operation is not a commercial redistribution right and not a hosting promise.

| Record | Where it is stored | What the stored fields are |
| --- | --- | --- |
| Rule license strings | [rulePackageManifestSchema](../../../../packages/documents/src/schema.ts) `license`: `name`, `source`, `attribution`. [importRulePackage](../../../../packages/documents/src/rule-import.ts) copies those three strings onto `offscreen.rule-package-manifest.v1` and returns a content-addressed root hash. | Provenance strings plus the hash of the manifest. The authoring guide already says recording them is not legal approval. |
| Rule identity | The same manifest: ruleset id, author operation id, revision, previous root hash, adapter id, adapter version. | Which bytes and which adapter were pinned. |
| World identity | [worldPackageManifestSchema](../../../../packages/documents/src/schema.ts): world id, title, revision, previous root hash, author operation id, orientation document, entries. The schema has no `license` object. | Package identity and document list. The Vvardenfell sample therefore has nothing in this schema that could be read as a license grant. |
| Start pin | [startPackageManifestSchema](../../../../packages/documents/src/schema.ts): world pins and one rule pin. The schema has no `license` object. The Seyda Neen descriptor matches that shape. | Exact roots the start names. A pin is not a license. |
| Campaign clone provenance | [Campaign bootstrap](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap): every cloned document cites its package document revision, and later campaign edits do not mutate the reusable template. | A back-reference to the bundle version. |

[Reusable world libraries](../../../../docs/technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays) already says imported external settings remain private user-provided content subject to the user's rights and product policy, and that this project does not assume permission because a model recognizes a name. The same section says a generated addition keeps its originating passage, invention domain, and permission as provenance. Those sentences stay on that page. They describe records and a refusal to assume permission. They do not select a public offer, a price, or a moderation procedure.

## Open decisions

Each item needs owner and legal review. Writing it here does not select it.

| Decision | What stays open | Fact already on the books |
| --- | --- | --- |
| Public or paid distribution | Whether any authored world, rule package, or campaign may be offered to the public, sold, or kept private, and on what terms. | Checked-in samples are local evidence of shape. NOTICE.md states the SRD 5.2.1 CC BY 4.0 attribution. Neither fact is a distribution offer. |
| User uploads | Whether a person may upload a package, what right they must already hold, and what the product tells them. | Directory import can admit bounded text and store a root. Admission is not those terms. |
| Generated media | Whether model-produced prose, images, or other media may be stored, shown, or redistributed, and who holds which rights. | A generated addition's passage, invention domain, and permission can be retained as provenance. That retention is not a media license. |
| Third-party setting references | Whether the Vvardenfell sample, or any other third-party fictional setting, may be kept, shown, or distributed. | The four Vvardenfell files contain no attribution sentence. The SRD attribution does not cover that setting. No license is inferred from the files being present. |
| Attribution propagation | Which later copy, campaign pin, generated passage, or public page must repeat which attribution string. | NOTICE.md, `/rules`, and the rule-package `license.attribution` string already carry the SRD attribution. The duty to repeat it beyond those locations is not decided here. |
| Moderation | Who may refuse, label, or remove a package, and what a removal request must contain. | No takedown policy is written on this page. |

## What an import does not grant

A successful import is not permission to redistribute commercially. Storing `license.name`, `license.source`, and `license.attribution`, hashing a manifest, or pinning a world root records provenance. Those records do not grant publication rights.

The SRD attribution does not cover unrelated fictional settings. It does not cover the Vvardenfell sample. A model recognizing a place name does not supply permission.

A content rating, a ban list, and the rule that model memory of a recognizable franchise setting is not supplied canon stay on their existing owners. This page does not adopt them and does not replace them.
