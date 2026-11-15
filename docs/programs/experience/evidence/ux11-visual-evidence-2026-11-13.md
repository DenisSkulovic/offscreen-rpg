# UX11 visual evidence | shipped surfaces | 2026-11-13

**Kind:** provider-free Storybook catalogue + Vitest/axe + browser captures. **Not** a human user study, live OAuth proof, or paid-model certification.

## Surfaces under review

| Surface | Storybook | Automated | Browser capture |
| --- | --- | --- | --- |
| Public portal `/` | `Experience/UX evidence` · Portal | axe in `ux-evidence.test.tsx` | 1440 + 375 (this Change) |
| Scripted `/demo` | Preview · first decision / 375 | opening choice + no advance-first | 1440 + 375 (PF02 + this Change) |
| StoryFrame quiet / interrupted | Stage · quiet / hold | axe decision + quiet | Storybook review |
| Player home one life | Home · one life | prior list tests | Storybook (auth SSR not in agent browser) |
| Player home failure ≠ empty | Home · stories failed (counterexample) | deliberate false-state rejection | Storybook |

## Commands

```text
pnpm --filter @offscreen/web exec vitest run src/features/ux-evidence
pnpm --filter @offscreen/web test:fast
pnpm --filter @offscreen/web storybook   # Experience/UX evidence
```

## Counterexample (required)

A stories list **503** must show a recoverable alert and must **not** claim “every story begins…” / verified empty. Covered in Vitest and Storybook `Home · stories failed (counterexample)`.

## Explicitly unobserved

- Human comprehension study (T1–T8 in validation plan) — **unobserved**
- Live authenticated `/stories` SSR HTML in this agent session
- Full keyboard/screen-reader pass with assistive tech
- Pixel taste / brand preference — human judgment only

## Provider spend

None.
