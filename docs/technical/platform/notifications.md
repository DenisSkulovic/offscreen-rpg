# Notifications and reaching the player

Notifications are part of gameplay, not a decorative integration. A player should be able to leave the page and hear about a development, while the system remains coherent if delivery is late or never arrives.

## Recommended first channel

Start with responsive web plus Web Push, using a service worker and a manifest so the site can be installed as a web app. Notifications open the relevant current story; choices happen in the browser initially. This avoids maintaining a separate native application and a second interaction implementation.

This is a recommendation to verify on the actual target phones before committing the channel. On iOS/iPadOS, WebKit documents push for Home Screen web apps and requires a permission request following user interaction. Merely visiting the website is not a reliable substitute for onboarding the user into notifications. Test install, permission, locked-phone delivery and reopening on the supported devices. [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

The product should explain setup when the player wants to leave a running story, offer a test notification and show whether that device is subscribed. Do not request permission on the first landing page before demonstrating value. Declined permission is a supported state; show that the player must return manually or choose another available channel.

Register subscriptions through an authenticated endpoint and associate them with both account and device/browser installation. Multiple devices may receive updates, but a browser endpoint must not remain attached to a previous account after account switching. Recommended logout behavior is to unlink that device's subscription without pausing the story; explicitly tell the user how to keep receiving updates on another device. Subscription expiry, permission revocation and re-registration are supported states, not silent permanent delivery failures.

## Alternatives

| Channel | Fit | Cost or constraint |
| --- | --- | --- |
| Web Push | First recommendation; links directly to the existing scene | Permission and platform setup; delivery remains best effort. |
| Telegram bot | Strong candidate if direct messaging matters more than avoiding another app | Player must initiate contact/link the bot; separate account linking and webhook handling. |
| Slack | Attractive optional office-day integration | Workplace installation policies can block adoption; identity linking and interactive callback handling are additional work. |
| Email | Recaps, account notices and nonurgent fallback | Poor fit for a rapid back-and-forth scene. |
| Native app | Potential later dedicated experience | Another distribution, permissions and client-maintenance commitment; not necessary for initial play. |

Telegram bots cannot simply initiate an unsolicited conversation; the user must contact or add them first. Slack workspaces can require approval for installed apps. Those constraints make Slack a poor mandatory route for all players, even if it is excellent in a personal test workspace. [Telegram bots](https://core.telegram.org/bots), [Slack app approval](https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace).

WhatsApp is not part of the proposed first integration. Do not build several providers at once. Use a small delivery interface that can support a second channel when chosen, without implementing an abstract omnichannel platform.

## Delivery flow

1. A committed story change writes a notification intent to the outbox in the same transaction.
2. The outbox relay starts a bounded Temporal delivery workflow with a stable notification ID. A repeated start must locate the existing operation rather than send again. Delivery proceeds independently of the story workflow so a slow push provider does not block story progression.
3. Activities resolve recipients, current membership, preferences and channel subscriptions, then persist per-recipient/channel delivery records. Check relevance immediately before sending a short payload with type, safe preview, story reference, decision reference if applicable and deadline.
4. Configure Activity retries only for eligible transport failures within the notification's useful lifetime, checking recorded delivery state on each attempt. Retain provider acknowledgements when available. Disable expired subscriptions and support unlinking a channel.
5. Opening the notification fetches current authorized state. If the decision ended, show the outcome; do not execute a stale command from the URL.

Acceptance by a push service is not proof that a person saw the message. Even successful delivery cannot guarantee five minutes of human attention. Response windows begin from an authoritative story publication rule, not an unverifiable read receipt. Best-effort contact and permitted fallback behavior are both necessary.

Group low-urgency reports; do not collapse distinct unresolved decisions into an ambiguous notification. Use expiry and replacement tags where supported, but do not rely on those features as the only duplicate protection. Messages may duplicate after an uncertain send; application commands must remain idempotent.

Include a decision timing/version reference on delivery intents. Recheck it before sending: a paused story must not receive a fresh “five minutes remaining” message for its suspended deadline. A resolved/expired decision is skipped or becomes a clearly retrospective report using committed content, without another storytelling call. A late or already displayed notification cannot always be recalled; opening it must show the current situation and updated timing.

## Contact, privacy and actions

Quiet hours mute or defer contact; they do not change story time or permissions. Offer a neutral lock-screen preview as a default so potentially graphic or embarrassing story text does not appear at work. Opening the app reveals the scene to an authenticated member.

Store push subscriptions and channel tokens as sensitive integration data. Encrypt reusable external credentials, keep tokens out of logs, and make disconnection effective for queued deliveries as well as future ones.

If Slack buttons are added, verify request signatures and reject stale callbacks. Slack expects an acknowledgement within three seconds; acknowledge receipt promptly, then resolve work asynchronously. The callback must identify a linked, authorized player and pass through the same deadline/idempotency rules as a browser command. Acknowledge receipt is not the same as accepting an already expired choice. [Slack interaction handling](https://docs.slack.dev/interactivity/handling-user-interaction/).

## What to prove early

Test a locked phone receiving a development, an expired choice, denied permission, quiet hours, logout/revocation, a duplicate send and a notification received after the browser already resolved the scene. If the intended phone cannot support an acceptable Web Push flow, select Telegram or another concrete channel before spending time polishing an unusable notification experience.
