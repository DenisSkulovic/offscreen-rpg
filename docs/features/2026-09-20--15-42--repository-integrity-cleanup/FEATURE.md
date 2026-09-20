# Repository integrity cleanup

Status: R1–R4 implemented. The remaining R5 file-concentration cleanup is behavior-neutral follow-up; this work does not add gameplay or authorize live inference.

## Intended outcome

The repository should tell the truth about its active work, keep development fixtures outside normal application composition, and enforce recovery/settings fences on the server rather than relying on UI behavior. Existing benchmark worlds, QA expectations and connected fixture coverage remain durable design evidence.

## Scope

- reconcile the active-feature index and current checkpoints, and remove empty feature-directory residue;
- expose an ordinary story application facade from the stories package and keep Chamber-only start, response and inspection operations behind developer-tool composition;
- construct QA and Chamber services only when developer tools are enabled;
- reject pending-action narration retry before the exact action has settled and promoted its receipt;
- reject creative-setting mutation while a current Storyteller resolution owns the narrative revision;
- keep private pending-action persistence/orchestration types in the application layer rather than the pure game package;
- record oversized QA/test modules as bounded follow-up restructuring, preserving every scenario.

## Boundaries

This cleanup does not replace the selected D&D rules foundation, generalize the current mechanical character schema, redesign gameplay, delete examples, split every large file, or change provider authorization. The POC remains free to reset disposable data and task formats under the repository lifecycle policy.

## Acceptance

- ordinary story HTTP routes depend on the ordinary story facade, not `developer-tools`;
- Chamber story mutation and inspection routes exist only with the developer-tools switch;
- disabled developer tooling does not instantiate Chamber or QA services;
- pending consequence retry fails until its exact execution is settled and its receipt references the same generation;
- settings cannot change underneath an admitted current-resolution task;
- pure immediate-action mechanics no longer export the application-specific frozen pending-resolution envelope;
- active documentation has one accurate continuation point and no empty feature directories.

## Owning specifications

- [Working agreement](../../../.agents/rules/working-agreement.md)
- [Code quality](../../engineering/code-quality.md)
- [Storyteller runtime](../../technical/storyteller-runtime.md)
- [Code navigation](../../engineering/code-navigation.md)
