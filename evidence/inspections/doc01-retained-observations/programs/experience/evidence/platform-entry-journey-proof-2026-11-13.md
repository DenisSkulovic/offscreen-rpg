# Platform entry journey proof | PF05 | 2026-11-13

**Scope:** provider-free Vitest journey suite + Storybook `Platform/Entry journeys` for PF01–PF04 surfaces. Not a live OAuth or paid-model certification.

## Commands run

```text
pnpm --filter @offscreen/web exec vitest run src/features/platform-entry
pnpm --filter @offscreen/web test:fast
```

## Coverage map

| Slice | Evidence |
| --- | --- |
| A Anonymous first contact | `platform-entry-journey.test.tsx` + prior `public-portal.test.tsx`; Storybook `A · Public portal` |
| B Scripted memory | Journey + `public-demo/*`; Storybook `B · Scripted preview D0`; earlier browser D0/visitor/return screenshots |
| C Safe sign-in return | Journey + `safe-entry-destination` + `sign-in-button` tests; Storybook `C · Sign-in create intent` |
| D Player home variants | Journey failure case + `live-story-list`/`draft-list` tests; Storybook empty/one/many |
| E Security/trust (frontend) | Hostile next rejection; stories 503 ≠ empty; distinct Query clients. Live wrong-viewer Nest denial remains private-route integration (separate). |
| F Responsive/a11y | Portal/demo browser captures from PF01/PF02 (1440/375). Full axe/Playwright pass not claimed in this packet. |

## Explicitly not verified here

- Live GitHub OAuth browser round-trip
- Sponsored grant / paid Generate after Create
- Cross-account SSR HTML denial (existing private-route integration owns that)
- Destructive disposable DB reset

## Provider spend

None.
