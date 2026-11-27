# Custom controller (comparison baseline, not preferred)

## Minimum plausible implementation
Use established provider/message/tool schema primitives, not raw protocol reimplementation. Temporal Workflow owns deterministic while/step controller; provider/tool Activities are admitted and custody-guarded. Domain supplies mission, context and completion validation. Implement only fixed bounded loop, tool result conversion, stop/cancel and errors needed by first consumer. No speculative generic graph engine, memory framework, delegation DSL, compaction system or custom scheduler.

## Benefit and cost
Full visibility of control and identity propagation; no framework-specific hidden hooks. However, must own message ordering, parallel tool resolution, malformed output repair, provider-specific tool IDs/reasoning continuations, cancellation, continuation, limits, instrumentation, SDK upgrades and compatibility. This cost grows with modalities, subagents and model variations. Established SDK can handle much of this. Existing repository's provider custody and Storyteller contracts are requirements, not reason to retain old loop.

## Specimen / rejection criterion
Keep as control comparison only if needed: same fake two-round mission, no proprietary runtime dependencies, same Activity and financial guards. Measure implementation surface, failure paths and extension effort vs SDK-based samples. If SDKs meet gates, reject custom engine. If all fail, identify exact missing interception seams and compare targeted wrapper or smallest controller; do not build all proposed folders just because framework was rejected. No code or runtime proof.
