# Zernio — scheduling, automation and analytics

Zernio is a second provider alongside Composio. Composio executes Instagram API
calls; Zernio owns everything with a **server-side clock or an engagement
history** behind it — the publishing queue, comment-to-DM automations,
cross-posting, and measured analytics.

Both are reached the same way: an MCP connector, authorized once. The plugin
ships `.mcp.json` with `composio` and `zernio`; `/mcp` shows status and signs in.

## What Zernio owns, and why

| Capability | Why not Composio |
|---|---|
| Scheduled posts and queue slots | Instagram has no scheduling API; Zernio holds the post and fires it |
| Retry on failure | 3 attempts with exponential backoff, then a webhook |
| Comment-to-DM and story-reply automations | No Instagram tool does this at all |
| Private reply to a commenter | Instagram supports it; the Composio toolkit does not expose it |
| Best time to post, content decay, frequency-vs-engagement | Needs history across posts, not a single call |
| Cross-posting one payload to several platforms | Composio is one toolkit per call |

Everything else — reading media, comments, insights on one post, DMs, profile —
stays on Composio. Do not route those through Zernio.

## Discovering ids

Never hardcode ids; they differ per install and per account.

- **Accounts**: list connected accounts and take the entry whose `platform` is
  `instagram`. Its `_id` is the `accountId` used in `platforms[]`. Check
  `isActive` and `needsReconnection` before using it.
- **Profile**: the account's `profileId` is the profile that owns queue slots.
  It is also in the app environment as `ZERNIO_PROFILE_ID`.

## Scheduling: always queue, never compute the time

```json
POST /v1/posts
{
  "content": "caption text",
  "mediaItems": [{ "type": "image", "url": "https://..." }],
  "platforms": [{ "platform": "instagram", "accountId": "<accountId>" }],
  "queuedFromProfile": "<profileId>"
}
```

The response carries the assigned time in `scheduledFor`.

**Do not read the next slot and pass it as `scheduledFor`.** That bypasses queue
locking, and two concurrent creates land on the same slot. Slot preview is for
*showing* the user a time, never for scheduling one. Use `scheduledFor` directly
only when the user names a specific time; otherwise queue.

`timezone` applies per post. When the user says "9am", ask whose 9am if the
profile timezone is not already established — a wrong timezone publishes at the
wrong hour and cannot be unpublished.

## The queue needs slots before it can hold anything

`queuedFromProfile` assigns a post to the **next free slot**, so a profile with
no slots configured cannot queue at all. Check first:

```
GET /v1/queue/slots?profileId=<profileId>
```

A **404 `No queue schedule found for this profile`** means no slots exist yet.
That is a setup gap, not an outage — do not report it as Zernio being down, and
do not fall back to the app queue for it. Offer to create a schedule:

```json
POST /v1/queue/slots
{ "profileId": "<profileId>", "name": "Default",
  "timezone": "Europe/Paris",
  "slots": [ ... weekly recurring times ... ] }
```

The first queue created becomes the default. Ask for the timezone and the
posting times rather than inventing a cadence — the slots decide when this
account posts for as long as they exist.

Until slots exist, schedule with an explicit `scheduledFor` + `timezone`, which
needs no queue.

## Instagram fields

All go in `platformSpecificData` on the Instagram platform entry:

`contentType: "story"` for Stories (omit it — single videos become Reels, images
go to feed) · `shareToFeed` · `collaborators` (max 3, public Business/Creator) ·
`userTags` (images need `x`/`y` 0–1; Reels tag by username only; `mediaIndex`
picks a carousel slide) · `instagramThumbnail` or `thumbOffset` for a Reel cover
· `firstComment` (the place to put a link, since captions have none) ·
`isAiGenerated` for AI-generated **media**, not AI-written captions.

Limits: caption 2,200 chars (125 before the fold), 10 carousel images, image
8 MB, video 300 MB feed/reels and 100 MB stories, Reels max 90 s, **100 posts
per rolling 24 h**. Media is required — Instagram has no text-only post.

Google Drive, Dropbox, OneDrive and iCloud links **do not work** as media URLs;
they serve HTML, not a file. Use a direct CDN URL or Zernio's media presign.

## Duplicate protection

- Same `x-request-id` within ~5 min returns the original post as `existingPost`
  with **HTTP 200** — a retry, not a new post.
- Identical `(platform, accountId, content + media)` within 24 h is rejected
  **409** with `existingPostId`. Do not defeat this by tweaking a caption to
  force a second identical post; surface the original and ask.

## When Zernio is unavailable

Zernio is a network service and will sometimes be unreachable. **Assume it can
fail on any call**, and check before promising anything time-based.

Read the failure, then act:

| Signal | Meaning | Do |
|---|---|---|
| Connector missing / not signed in | `/mcp` never authorized | Say the Zernio connector is not authorized and how to fix it. Do not fall back silently. |
| Network error, timeout, 502/503/504 | Zernio is down | Treat every Zernio capability as unavailable this session. Check [status.zernio.com](https://status.zernio.com). |
| 503 `platform_disabled` | Instagram connections paused upstream | Zernio is up but Instagram is not; other platforms may still work. |
| 401 | Key or OAuth invalid | Re-authorize. Never retry in a loop. |
| 403 `ACCOUNT_DISCONNECTED` | Token expired or revoked | Reconnect the account, then re-list accounts for a fresh id. |
| 403 `ACCOUNT_NOT_ENABLED_FOR_POSTING` | Connected for ads only | Reconnect as a posting account. |
| 403 on an analytics route | Analytics add-on missing | Say the metric is unavailable on this plan. **Never estimate the number.** |
| 429 | Rate limited | Sliding window; back off and retry once. Free tier is 60 req/min and 6 req/s on analytics. |
| 409 | Content-hash duplicate | Show the existing post; do not repost. |

### The fallback ladder

Work down it, and **say out loud which rung you landed on**:

1. **Scheduling** → the Content Studio app's own queue
   (`POST /api/ig/schedule`, see [app-api.md](./app-api.md)) if the app is
   running. It is a weaker queue — it only fires while the app process is up —
   so state that difference rather than presenting it as equivalent.
2. **Still nothing** → offer to publish immediately through Composio instead, or
   to hold the draft until Zernio is back. Ask; do not pick for them.
3. **Analytics** → Composio's own Instagram insights cover per-post and account
   metrics. Best-time, content-decay and frequency-vs-engagement have **no**
   Composio equivalent — report them as unavailable rather than approximating.
4. **Automations, private replies, cross-posting** → no fallback exists. Say the
   capability is Zernio-only and currently unavailable, and offer the manual
   equivalent (triage via `instagram-monitoring`, one platform at a time).

**Never**: claim a post is scheduled when no service is holding it; retry a
failed publish blindly, since the first attempt may have partly succeeded; or
present a Composio number as if it were the Zernio metric that was asked for.
