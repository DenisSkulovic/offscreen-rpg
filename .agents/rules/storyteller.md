# Storyteller tuning discipline

Read before tuning quality, profiles, prompts, context, output contracts or model routes. Use the [tuning procedure](../../docs/skills/storyteller-tuning/SKILL.md) to investigate; [spending](spending.md) independently controls provider work.

Treat a disappointing model result as evidence to classify, not permission to
edit the nearest shared prompt. Before tuning, identify which layer owns the
desired behavior:

- shared task instructions own authority, evidence, output shape and universal
  invariants only;
- Storyteller profiles own tone, dramatic rhythm, initiative, surprise,
  consequence style and normal choice character;
- campaign direction owns whether this particular story cultivates a grand
  narrative, recurring pressure or deliberately inert/ordinary life;
- rules and canonical content own fictional facts, available mechanics and
  time semantics;
- route/model policy owns capability, latency and cost tradeoffs;
- presentation owns what the player sees and how generated material is framed.

Do not encode one reviewer preference—more action, fewer choices, greater
brevity, stronger comedy, less inertia—as a universal task rule unless the
product contract truly forbids the opposite. Contrast every proposed tuning
against at least one profile or benchmark that legitimately wants the opposite
behavior. Change the narrowest owning layer, preserve the original trace, and
evaluate that change on both the target case and its contrast. If ownership is
unclear, document the hypothesis and inspect exact saved packets before editing.
Structural validity, profile adherence, campaign-direction adherence, model
capability and subjective enjoyment are separate verdicts.

For model-authored structured output, treat the transmitted schema as a task
interface rather than a mirror of the persistence DTO. Before adding prompt
warnings, lowering temperature or spending on another sample, compare that
schema with downstream admission: remove fields code can derive, constrain
references and ranges from captured state where the provider can express them,
and compile the lean proposal into the authoritative internal shape. Keep
semantic validation as defense in depth, and verify the provider's strict-schema
subset separately from local type parsing. These constraints may enforce
authority and validity, but must not encode a preferred creative style.

Treat creative neutrality as an engine invariant. The shared runtime has no
preferred pace, flavor, dramatic intensity, initiative level, choice density or
kind of enjoyment. Judge generated gameplay first against the exact captured
Storyteller profile, campaign direction, opening and established fiction. A
reviewer's taste can reject that configured experience or motivate a profile
change, but it cannot become an implicit engine default. Neutrality does not
weaken engine authority over declared rules, time, evidence, persistence,
permissions, safety or spending.
