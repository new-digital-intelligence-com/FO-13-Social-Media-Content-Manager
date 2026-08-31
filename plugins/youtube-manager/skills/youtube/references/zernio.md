# Zernio — scheduling, analytics and cross-posting

Zernio is a second provider alongside Composio. Composio executes YouTube Data
API calls; Zernio owns everything with a **server-side clock or an engagement
history** behind it — scheduled uploads, deep channel analytics, and
cross-posting a video's derived content to other platforms.

Both are reached the same way: an MCP connector, authorized once. The plugin
ships `.mcp.json` with `composio` and `zernio`; `/mcp` shows status and signs in.

## What Zernio owns, and why

| Capability | Why not Composio |
|---|---|
| Scheduled uploads and queue slots | Zernio holds the video and flips it public at the slot time |
| Retry on failure | 3 attempts with exponential backoff, then a webhook |
| Audience retention curve, demographics, daily views | The Data API alone does not return these; they need `yt-analytics` |
| Best time to post, content decay | Needs history across videos |
| Cross-posting a video's repurposed content | Composio is one toolkit per call |

Everything else — listing videos, captions, playlists, comments, metadata edits
— stays on Composio. Do not route those through Zernio.

**Quota still applies.** Zernio publishes through the same YouTube Data API, so
a Zernio upload spends your channel's ~1600 units exactly as a Composio one
does. Zernio does not buy you extra quota; it buys you a clock and a retry.

## Discovering ids

Never hardcode ids. List connected accounts and take the entry whose `platform`
is `youtube`; its `_id` is the `accountId`, and its `profileId` owns the queue
slots. Check `isActive` and `needsReconnection` first.

## Scheduling an upload

```json
POST /v1/posts
{
  "content": "description text",
  "mediaItems": [{ "type": "video", "url": "https://..." }],
  "platforms": [{
    "platform": "youtube",
    "accountId": "<accountId>",
    "platformSpecificData": { "title": "...", "visibility": "public" }
  }],
  "queuedFromProfile": "<profileId>"
}
```

A scheduled YouTube post **uploads as private and flips to public at the slot
time**. So the video exists on the channel before it is visible — say that,
because a user who checks the channel early will see it sitting there private.

**Do not read the next slot and pass it as `scheduledFor`** — that bypasses
queue locking and two creates can take the same slot. Preview a slot only to
show the user a time.

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

## YouTube fields

In `platformSpecificData`: `title` (100 chars; **the top-level `title` field is
display-only and is NOT the video title**) · `visibility` public/private/unlisted
· `categoryId` (default `"22"` People & Blogs) · `playlistId` · `firstComment`
(auto-posted and pinned; on a scheduled post it lands when the video goes live)
· `containsSyntheticMedia` for AI disclosure · `madeForKids`.

**`madeForKids: true` is permanent.** It disables comments, the notification
bell, personalized ads, end screens and cards on that video for good. COPPA
violations carry fines upward of $42,000. Never set it without an explicit
instruction, and confirm before you do.

Limits: title 100 chars, description 5,000, tags 500 chars combined (each 100),
one video per post, 15 min max on unverified channels. Shorts are auto-detected
from duration and aspect ratio — there is no Shorts post type.

Uploads default to `visibility: "public"` in the API. The channel rules require
**private unless the user explicitly asks to publish** — set it deliberately.

## Duplicate protection

Same `x-request-id` within ~5 min returns the original post (HTTP 200). Identical
content to the same account within 24 h is rejected 409 with `existingPostId`.
Surface the original rather than forcing a second upload — a duplicate upload
also burns another ~1600 quota units.

## When Zernio is unavailable

Zernio is a network service and will sometimes be unreachable. **Assume it can
fail on any call**, and check before promising anything time-based.

| Signal | Meaning | Do |
|---|---|---|
| Connector missing / not signed in | `/mcp` never authorized | Say the Zernio connector is not authorized and how to fix it. Do not fall back silently. |
| Network error, timeout, 502/503/504 | Zernio is down | Treat every Zernio capability as unavailable this session. Check [status.zernio.com](https://status.zernio.com). |
| 503 `platform_disabled` | YouTube connections paused upstream | Zernio is up but YouTube is not. |
| 401 | Key or OAuth invalid | Re-authorize. Never retry in a loop. |
| 403 `ACCOUNT_DISCONNECTED` | Token expired or revoked | Reconnect, then re-list accounts for a fresh id. |
| 403 on an analytics route | Analytics add-on missing, or `yt-analytics.readonly` not granted | Say the metric is unavailable. **Never estimate it.** |
| 403 from YouTube itself | Channel suspended, or quota exhausted | Neither is retryable. Quota resets daily, Pacific. |
| 429 | Zernio rate limit | Back off and retry once. Free tier is 60 req/min, 6 req/s on analytics. |
| 409 | Content-hash duplicate | Show the existing post; do not re-upload. |

### The fallback ladder

Work down it, and **say out loud which rung you landed on**:

1. **Scheduling** → **there is no fallback.** The app's queue is Zernio; the
   old local queue and its in-process timer were removed, because they only
   published while the app happened to be running. If Zernio is unreachable,
   nothing can be scheduled. Say that plainly.
2. **Instead** → offer an immediate upload through Composio as `private`, for
   the user to publish by hand later. Ask; do not pick for them.
3. **Analytics** → Composio returns channel and video statistics (views, likes,
   comments). Retention curves, demographics, daily views, best-time and decay
   have **no** Composio equivalent — report them unavailable rather than
   approximating from view counts.
4. **Cross-posting** → publish to each platform separately through its own
   toolkit, and report exactly which ones succeeded. Partial success is normal
   here and must be stated per platform, never summarized as "posted".

**Never**: claim an upload is scheduled when no service is holding it; retry a
failed upload blindly, since the first attempt may have consumed quota and
partly succeeded; or present a Data API statistic as if it were the analytics
metric that was asked for.
