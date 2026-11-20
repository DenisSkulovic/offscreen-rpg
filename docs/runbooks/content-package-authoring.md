# Content package authoring

**Reader question:** How do I prepare a world, rule or start directory, check it, publish an immutable root and pin that root when a campaign starts?

**Normative status:** task guide. This page is not a product rule and not a technical contract. Immutable package roots, adapter identity, visibility and start activation stay in [Context and memory](../technical/storyteller/context-and-memory.md).

**Owner:** this page, for the authoring task. Storage behavior stays in [Campaign documents](../../packages/documents/README.md). Schema and admission stay in the import modules named below.

**Explore by question:** [world directory](#write-a-world-directory) · [rule directory](#write-a-rule-directory) · [start directory](#write-a-start-directory) · [publish a root](#validate-the-source-and-publish-an-immutable-root) · [instantiate](#instantiate-from-the-pinned-roots) · [commands](#commands) · [negative cases](#negative-cases).

Checked-in samples are evidence of the current source shape. Their presence does not approve a license, grant rights in the SRD text, or grant rights in the Vvardenfell sample. A package cannot carry arbitrary user-authored code. `adapterId` names an adapter the application already contains.

## Write a world directory

A world directory is a tree of Markdown, with `WORLD.md` at its root. There is no `world-package.json`. The caller of `importWorldPackageDirectory` supplies `worldId`, `operationId`, `title` and `sourceDirectory`.

The checked-in sample is [content/worlds/vvardenfell-poc](../../content/worlds/vvardenfell-poc/WORLD.md):

- `WORLD.md`
- `locations/seyda-neen.md`
- `locations/census-and-excise-office.md`
- `routes/seyda-neen-to-balmora.md`

`WORLD.md` is the orientation. Every other `.md` file is lore. Directory import assigns authority `canon` and visibility `player-known`. Front matter in those files is body text; it does not set kind, authority or visibility. A `.txt` file is stored as `.md`. Dotfiles and other extensions are ignored. The importer limits are 256 files, 512 KiB each and 8 MiB total (`maximumWorldImportFiles`, `maximumWorldImportFileBytes`, `maximumWorldImportBytes` in [world-import.ts](../../packages/documents/src/world-import.ts)).

The sample's world id, revision and root hash are the pin in [start-package.json](../../content/starts/seyda-neen-prisoner/start-package.json) (`mount`: `vvardenfell`). [Chamber story startup](../../tools/chamber/src/main.ts) passes that same world id and refuses to continue when a fresh import hashes to something other than the checked-in root literal. At this revision that literal is the start descriptor's world root hash. The error tells the operator to update the start package. Campaign objects already stored under the previous hash stay on that hash.

Directory import stores `WORLD.md` as player-known canon orientation and every other Markdown page as player-known canon lore. A campaign uses that package as source canon when it pins the published root. Lifecycle, overlays and invention ceilings are [Reusable world libraries and campaign overlays](../technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays). Allowed world document kinds are `worldPackageDocumentKindSchema` in [schema.ts](../../packages/documents/src/schema.ts). That schema excludes `private-possibility` and `world-obligation`.

## Write a rule directory

A rule directory has `rule-package.json` plus the Markdown pages it names. The sample is [content/rules/srd-5.2.1-subset/rule-package.json](../../content/rules/srd-5.2.1-subset/rule-package.json). Its `format` is `offscreen.rule-package-source.v1`. `RULES.md` is required and is the orientation. Each other page is a `rule-reference`. The sample pages are `checks/ability-checks.md`, `checks/advantage-and-disadvantage.md`, `checks/event-occurrence.md`, `activities/contribution.md`, `time/committed-time.md` and `authority/storyteller-and-engine.md`.

Each page lists one or more topic tags. Tags let a later task select a section. They do not execute mechanics. The sample engine identity is:

```json
"engine": {
  "adapterId": "srd-5.2.1-subset",
  "adapterVersion": 1
}
```

Use an adapter id the application already runs. A new string does not create an adapter. The sample `license` object records a name, a source URL and an attribution string. Recording those fields is not legal approval.

`importRulePackageDirectory` reads only declared pages, rejects a path that leaves the directory, and rejects a symlink. Published orientation text must stay within the compact limit enforced by `rulePackageManifestSchema`. File limits match the world importer (`maximumRuleImportFiles` and its byte limits in [rule-import.ts](../../packages/documents/src/rule-import.ts)).

Rule pages remain evidence. Binding them to an effect is [Reusable rule libraries](../technical/storyteller/canonical-documents-and-packages.md#reusable-rule-libraries).

## Write a start directory

A start directory has one `start-package.json` and the files that descriptor names. The sample is [content/starts/seyda-neen-prisoner/start-package.json](../../content/starts/seyda-neen-prisoner/start-package.json). Its `format` is `offscreen.start-package-source.v1`. The descriptor owns package id, title, author operation, world pins, the rule pin and each document's kind, activation, authority and visibility.

The sample files are:

- `START.md` — `orientation`, `initial-canon`, `canon`, `player-known`
- `identities/socucius-ergalla.md` and `identities/sellus-gravius.md` — `identity`, `initial-canon`
- `threads/release-processing.md` — `narrative-thread`, `initial-canon`
- `possibilities/larger-vvardenfell-pressure.md` — private possibility, below

`START.md` is required. World pins copy the published world id, root hash, revision and mount. The rule pin copies the published ruleset id, root hash, revision and the same `engine` object. At most eight world mounts are accepted (`startPackageSourceSchema`).

A private possibility in the sample is declared as:

```json
{
  "path": "possibilities/larger-vvardenfell-pressure.md",
  "kind": "private-possibility",
  "activation": "private-possibility",
  "authority": "noncanonical",
  "visibility": "storyteller-private"
}
```

`importStartPackageDirectory` reads only those declared paths. Markdown cannot carry `schemaId`. JSON must carry `schemaId`. An executable obligation is JSON with `schemaId` `world-obligation.v1`, kind `world-obligation`, activation `executable-obligation` and authority `canon`. The sample has no such file. The field list and the activation pairing live in `startPackageManifestSchema`, not in this guide.

What those activations mean at campaign start is [Campaign bootstrap](../technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap).

## Validate the source and publish an immutable root

Validation is the import function for that directory:

| Directory | Function | Published format |
| --- | --- | --- |
| World | `importWorldPackageDirectory` | `offscreen.world-package-manifest.v1` |
| Rule | `importRulePackageDirectory` | `offscreen.rule-package-manifest.v1` |
| Start | `importStartPackageDirectory` | `offscreen.start-package-manifest.v1` |

Each function parses the source, rejects unsafe paths and writes new content-addressed objects plus a manifest root. The current directory importers always publish `revision: 1` and `previousRootHash: null`. They return the new root hash. They do not open a campaign, and they do not schedule an obligation.

Publication stores a new object. It does not overwrite an older hash. That storage rule is [Campaign documents](../../packages/documents/README.md) and [Publication across files and the execution ledger](../technical/storyteller/canonical-documents-and-packages.md#publication-across-files-and-the-execution-ledger).

A campaign adopts a later library revision only through the explicit conflict-checked operation in the world-library contract. No importer in this tree performs that adoption, and no root `package.json` script publishes revision 2.

## Instantiate from the pinned roots

`instantiateStartPackage` loads the start manifest by the root hash the caller stored. It reloads each pinned world manifest and the pinned rule manifest. World id and revision must match the pin. Rule-set id, revision, `adapterId` and `adapterVersion` must match the pin. It then clones the start package's own documents into a campaign manifest and writes `start/reference.json`, `world/references.json` and `rules/reference.json`. Shared world and rule bodies stay referenced by those pins.

When this staging is layered on ordinary campaign bootstrap, the package `START.md` is mounted at `start/package.md`. The collision and provenance rules are the [Campaign bootstrap](../technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap) contract.

`createStoryStart` in [stories/start.ts](../../packages/application/src/stories/start.ts) is the application path that can schedule work. It reads entries whose activation is `executable-obligation`, requires `schemaId` `world-obligation.v1`, and passes those proposals into campaign start. A Markdown document is not on that path.

## Commands

These commands were checked against `package.json` files at the inspected revision. This guide does not record a fresh test run.

| Command | Where it is defined | What it does for this task |
| --- | --- | --- |
| `pnpm --filter @offscreen/documents test` | `packages/documents/package.json` script `test` (`pnpm run build && node --test test/*.test.mjs`); the workspace includes `packages/*` | Builds `@offscreen/documents` and runs that package's importer tests. It takes no author-directory argument. |
| `pnpm fixture:import -- --store <directory>` | Root `package.json` script `fixture:import` (`node scripts/repo-tools/import-pinned-fixture.mjs`) | Imports the checked-in Seyda Neen world, rule, and start directories into that local document store. Checks the pinned world, rule, and start checksums. Writes `fixture-pin.json` in the store when the three root hashes match. A second run prints the same hashes. |
| `infra/kubernetes/lab/content-bootstrap/smoke.sh` | `infra/kubernetes/lab/content-bootstrap/smoke.sh` | On an already created `offscreen-lab` cluster, imports that same fixture into the existing SeaweedFS lab store and reads the three pinned hashes from a second Job. Downstream release and start boundaries are [Integration handoff (BOOT03, TURN02)](kubernetes-content-bootstrap.md#integration-handoff-boot03-turn02). |

`pnpm fixture:import` accepts that one trusted fixture. It writes an operator pin in the store directory the caller names. The pin is not a player catalogue, not an opening candidate, and not a campaign row. A local `fixture-pin.json` is not the shared-cluster Pod proof. That proof is [Kubernetes content bootstrap](kubernetes-content-bootstrap.md).

Refused for authoring validation:

- `pnpm story:local` and `pnpm story:server` exist in the root `package.json`. They start local Story mode. `story:local` reads provider credentials. Chamber imports the checked-in directories only. Neither command validates an arbitrary draft package.
- `OFFSCREEN_DEFAULT_RULE_SOURCE` is read by [apps/api/src/main.ts](../../apps/api/src/main.ts). When a document store exists, startup imports that directory, or `content/rules/srd-5.2.1-subset` when the variable is unset, and uses the result as the process default rule pin. [Local development](local-development.md#requirements-and-startup) documents the variable. Setting it does not validate a draft, and it does change which rule root the API process pins.
- `pnpm wiki:content-health` exists in the root `package.json`. It checks maintained wiki pages. It does not import a game content package.

Target-only, with no supported command in `package.json`:

- a validator that accepts an arbitrary world, rule or start directory and prints the resulting root hash. `pnpm fixture:import` is the one trusted Seyda Neen fixture, and it refuses a directory whose imported root differs from the pinned checksum.
- directory import of a package revision greater than 1, and any operation that points an existing campaign at that new root
- an author-supplied executable adapter or any other user-authored code inside a content package

## Negative cases

These outcomes remain false. Do not describe them as success.

**Editing shared `WORLD.md` in place must not be described as safely mutating an already started campaign.** The started campaign keeps the world root hash it pinned. Editing [content/worlds/vvardenfell-poc/WORLD.md](../../content/worlds/vvardenfell-poc/WORLD.md) changes the bytes the next import will hash. Chamber story startup then stops because the fresh hash differs from its checked-in root literal. Campaign objects already stored under the previous hash stay on that hash.

**Adding descriptive Markdown must not be described as scheduling a world obligation.** A new `.md` file is a document. Scheduling reads only an `executable-obligation` JSON document with `schemaId` `world-obligation.v1`. The sample thread `threads/release-processing.md` is initial-canon narrative. It does not schedule work.

**Undeclared content and a symlink that escapes the root are not admitted.** World import throws on a symbolic link, a special file, or a directory whose real path leaves the source root. Start and rule import throw when a declared path leaves the package directory or when the descriptor or a declared file is a symlink. A start or rule file omitted from its descriptor is not published. A world file that is not Markdown or text is ignored, as with the importer's `map.png` fixture. A symlink is not a way to publish a file that lives outside the root.

**A mismatched rule adapter does not instantiate.** `instantiateStartPackage` throws `Start rule reference mismatch` when the published rule manifest's `adapterId` or `adapterVersion` differs from the start pin. `createStoryStart` rejects the start when the process default rule pin is not that same ruleset, root, revision and engine.

**A hidden possibility must not be accidentally materialized.** The sample possibility stays `private-possibility`, `noncanonical` and `storyteller-private`. The manifest schema rejects any other combination for that activation, and it rejects `initial-canon` on a `private-possibility` or `world-obligation`. World-directory import cannot apply those private labels. `WORLD.md` is player-known canon orientation, and every other Markdown file under `content/worlds/vvardenfell-poc` is player-known canon lore. Import does not infer a secret from a filename or from prose.

**A package revision must not be described as mutating an existing campaign.** The directory importers publish a new revision-1 root. They do not overwrite the previous root, and they do not retarget campaigns that stored the previous hash. Pointing a campaign at a newer root is the explicit adoption operation in [Reusable world libraries and campaign overlays](../technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays). That operation is not a command on this page.

**A wrong checksum, a symlink, or a missing dependency must not replace the previous pin.** `pnpm fixture:import` exits non-zero and leaves `fixture-pin.json` byte-for-byte as it was. Objects already stored under the previous root hash stay on that hash.

**The local pin is not a player catalogue and not a shared-cluster publication.** `pnpm fixture:import` does not create a campaign. A start package root is not a successful opening candidate. A local `fixture-pin.json` is not evidence that a second Pod can read the same object. The cluster command is [Kubernetes content bootstrap](kubernetes-content-bootstrap.md).

## Where the contract lives

| Question | Owner |
| --- | --- |
| Which package root, adapter, visibility and start activation are binding? | [Campaign bootstrap](../technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap) |
| Which record kind owns a fact? | [One owner per kind of truth](../technical/storyteller/canonical-documents-and-packages.md#one-owner-per-kind-of-truth) |
| How are immutable objects stored? | [Campaign documents](../../packages/documents/README.md) |
| Which schema rejects a bad manifest? | [schema.ts](../../packages/documents/src/schema.ts) (`worldPackageManifestSchema`, `rulePackageManifestSchema`, `startPackageManifestSchema`) |
| Which function admits a directory? | [world-import.ts](../../packages/documents/src/world-import.ts), [rule-import.ts](../../packages/documents/src/rule-import.ts), [start-import.ts](../../packages/documents/src/start-import.ts) |
| Which function stages a campaign from a start root? | [start-instantiation.ts](../../packages/documents/src/start-instantiation.ts) |
