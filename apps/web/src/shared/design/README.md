# Shared design tokens

**Owner:** `tokens.css`, loaded once from `apps/web/app/style.css`. Storybook loads that same stylesheet. This directory is not a component package.

Platform roles (`--ui-*`) are the app chrome and system status. Reader roles (`--reader-*`) are the book leaf. A scene may set creative Play variables for chrome, stage, option surface, vignette, and texture. It does not assign `--ui-danger`, `--ui-focus`, `--ui-action`, `--ui-attention`, `--ui-success`, `--reader-ink`, or text selection.

Play and Stories keep their existing hex values by redefining the semantic role on that surface before the local `--sf-*` or `--sl-*` alias. Danger (`#f0b4ae` on the dark canvas, `#8a332c` on book paper) and success (`#b7d7c4` / `#1d5c42`) are defined for later notices. No current control paints them. Final art direction is not selected here.
