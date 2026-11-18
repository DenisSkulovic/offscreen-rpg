# Shared UI controls

**Owner:** `action.tsx` and `system-notice.tsx`. Styles live in `controls.css` and read platform tokens only.

`Action` is either `kind="link"` or `kind="button"`. A link navigates. A button mutates or refreshes. `pending` disables the button and sets `aria-busy`. There is no spinner. A `data-surface` value cannot clear `disabled`.

`SystemNotice` is always text. `error` uses `role="alert"`. `attention` and `success` use `role="status"`. `neutral` has no live role. The optional `action` is supplied by the caller and does not own a command.
