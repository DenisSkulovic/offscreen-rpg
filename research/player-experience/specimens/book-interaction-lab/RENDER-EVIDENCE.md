# Living Book | Render QA and evidence limits

**Date:** 2026-11-17. **Harness:** standalone HTML/CSS/JS executed in system Chromium through Python Playwright via set_content. Not the production Next/React renderer, no server or paid Storyteller operation. Lab controls are fixture-only.

## What passed

- **Targeted after-fix matrix: 12/12.** Viewports 320, 375 and 1440 CSS pixels × dedicated/continuous variants × 100/200% text. Long ten-paragraph prose and six offered intentions. Verified six unique choice IDs, no horizontal document/leaf/heading overflow, no nested decision-group scroll, and no JavaScript exceptions. All six choices remain in normal flow; the last can be reached by document scrolling.
- **Interaction smoke: 8/8.** Bookmark index opens, Journal opens, historical reader opens without live choices, return to Now, arrow key on focused button does not steal navigation, explicit Next turns, continuous-flow jump focuses question, and clicking current choice only opens noncommittal prototype notice.

## Earlier failures and verification honesty

The initial wider **48-case** scan failed at 320px and 200%-scale in continuous flow because the title overflowed (2 cases). Corrected heading wrapping and a faulty historical-title assertion. A subsequent complete rerun timed out and is **not claimed to have passed**. Targeted regression covered the risk case. Screenshot files and full test script are in the chat archive, not repository evidence.

## Important visual failure still present

At 200% on a 375px phone, the dedicated choice folio is taller than one viewport. It avoids missing options and hidden inner scrollbars, but **is not compatible with a fixed physical-page curl by assumption**. Continuous flow becomes extremely tall with long narrative and needs better reading-position aids. The D1 demo split by two paragraphs is only a scaffold and creates odd white space. Both need real design work.

## What has NOT been proven

Screen readers, complete keyboard/focus audit, 400% real browser zoom, real touch/drag and text selection, RTL/Cyrillic/Hebrew, actual language-sensitive text pagination, dynamic live offer replacement while reading, cross-user privacy, 2,000 passage history seeking, source-backed images, Storyteller-generated styles/semantic score, physical curl libraries, human usability, low-powered devices, WCAG certification.

Standards consulted: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html ; https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ . **Do not interpret green DOM assertions as accessibility compliance.**