# Phase 3 | Foundation grammar and component composition

**Status:** design basis for UI01–UI07, not approval of a final skin or a wholesale CSS rewrite.

## 1. What went wrong with earlier UI

The earlier prototype repeatedly used all-permanent chrome, thin micro-labels, generic rows and mismatched local palettes. BOOK01/02 improved structure but preserved fragmented `--sf-*`, `--sl-*` and global style choices. A formal design system solves **roles and consistency**, not merely publishing a prettier `:root`.

**Artistic position:** the platform should feel like a considered interactive literary instrument. It can be atmospheric and slightly theatrical without pretending every page is a game HUD, every card is a SaaS KPI, or every fantasy story must use brown parchment. A recognizable reader's book sits within a changeable environmental field.

## 2. Token grammar (not a chosen brand palette)

- **Scale primitives:** 4px-equivalent spacing steps (4/8/12/16/24/32/48/64px candidates, responsive fluid sizes where useful), typography roles (display, passage, title, control, meta, annotation), reading line measure (roughly 55–75 characters for ordinary prose), elevation, soft edge, line weight and short durations. These are **calibration candidates**; human visual approval determines the exact numeric scale.
- **Semantic platform:** canvas/surface/ink/muted/border/focus/status/safe action. System error, uncertainty, disabled and committed states must remain distinguishable even under unusual scene colors.
- **Book:** paper, book edge, passage ink, supporting ink, reading rhythm, folio and optional source illustration frame. Stable across cave/space/microbe; scene casts bounded lighting around it.
- **Creative:** optional backdrop/color/lighting/ambient/material cues from V1. Inputs are data, normalized and bounded. These never become raw class names or sources of platform-error semantics.

## 3. Minimal component registry

| Semantic owner | Reuse cases | Variation allowed | Variation forbidden |
| --- | --- | --- | --- |
| Action | Stories CTA, Create commit, book contents link/retry | primary/quiet/danger, waiting, icon+label | converting a navigation link to a POST, story-controlled disabled |
| SystemNotice | Loading failure, 202 accepted, stale refresh, 409 conflict | message density, status role, safe retry CTA | calling danger a mere creative glow |
| ReaderSurface | Now, Journal original passage | focused leaf vs flowing spread *when content safe* | text clipping to hit fixed ratio |
| NarrativeFlow | Play prose, historical original, fixture | source title/paragraphs/media only | rewriting exact published wording |
| DecisionGroup | Legacy/campaign offers | explore/commit, emphasis if valid | splitting/omitting eligible options |
| BookContents | Now/Journal/Stories/settings | discreet sheet/menu or in-book labels | permanent wide sidebar, loss of keyboard focus |
| SceneField | backdrop and optional media behind reader | V1 scene mood and slow motion | altering reader focus/permission or generated raw URL |
| SourceMedia | exact approved asset slot | decorative/supplemental, inset/wide | creating clues or requiring imagery to continue |

**Important:** these are **semantic responsibilities**, not an instruction to export eight needless wrapper components. Two existing components may already fulfill one row. Only extract shared code when it simplifies the application and is testable.

## 4. Component styling and documentation contract

Each new shared component should have: single-sentence owner/purpose, typed props, examples of normal/disabled/uncertain/readonly/no-data, keyboard/focus semantics, mobile/text-scale behavior, overridable *approved semantic* slots, no-source fallback, test story and negative proof. Treat surface elevation and motion as part of interaction semantics rather than miscellaneous decoration.

Storybook is the inspection lab; it does not become a second game engine. No fake network requests, provider calls or server truth in the component examples. MSW story fixtures remain isolated. Do not create style-only variants that cannot be explained by product need.

## 5. Concrete comparison specimens before final polish

Use the **same Greywater prose** and valid choices in: baseline, dark cave, clean ship log, abstract nonhuman, quiet no-art, malformed directive, pending/failed status and large text. Compare how the same book/source and shared controls behave. Also show Stories library and Create form side by side using identical action/focus/system semantic roles. Mobile at 320 and 375; larger 768/1440; actual browser zoom after smoke.

**Rejection criteria:** all scenarios get a glowing hero header, a static oversized topbar, dark-option-on-light-paper contrast problems, hidden choices after page turn, overloaded tokens, inaccessible menu, or a package that forces book layout ownership. Final aesthetic direction remains a human-facing later review, not a checkbox Cursor can mark Done from tests alone.