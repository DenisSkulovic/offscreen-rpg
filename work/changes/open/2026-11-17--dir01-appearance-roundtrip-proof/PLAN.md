# DIR01 execution plan

**Unselected and provider-free.** [CHANGE](CHANGE.md) remains the sole code scope.

## S0 – Trace exact read path
- [ ] Verify `publicSceneAppearanceV1Schema`, DB read projection, `resolveLivePresentation`, `StoryFrame` and any safe persisted fixture writer at current HEAD.
- [ ] Identify which tests genuinely exercise a database/read service and which merely call a mocked resolver. Report gap without guessing.

## S1 – Deterministic fixtures
- [ ] With a matching source identity, insert/provide a bounded safe appearance via an authorized test path.
- [ ] Compare identical published passage and current offer with/without style. Verify only backdrop/lighting/allowed choice accents change.
- [ ] Fault cases: wrong story/passage/offer, corrupt CSS-looking color, extra asset URL, absence, A→B story switch and invalid version.

## S2 – Evidence
- [ ] Run focused contract/read/frontend tests without provider or destructive DB reset; output actual commands.
- [ ] If read path is verified but no publisher write seam is safe, mark that limit explicitly; **DIR02 remains blocked**.
- [ ] No new backend API, schema, provider call or UI visual rework. Stop at a source-backed report and tests.