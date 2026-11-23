# Content packages

`@offscreen/content-packages` reads authored world, rule, and start source
bundles and stores their immutable manifests through `@offscreen/documents`.

Import validates `WORLD.md`, `RULES.md`, and `START.md`, licenses, engine pins,
activation, and path limits. It does not select a campaign head. Campaign
instantiation lives in `@offscreen/story-engine`.
