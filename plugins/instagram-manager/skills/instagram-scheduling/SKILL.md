---
name: instagram-scheduling
description: Schedule Instagram posts, manage the publishing queue, and keep a consistent posting cadence. Use when the user wants to schedule or queue a post, asks what is queued or going out next, wants to change or cancel a scheduled post, or asks whether they are posting often enough.
---

# Instagram scheduling

## Instagram has no scheduling API

Nothing in the Composio toolkit queues a post for later.
`INSTAGRAM_POST_IG_USER_MEDIA` creates a container and
`INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` publishes it — both immediate. Containers
expire in under 24 hours, so creating one early is not a scheduling mechanism.

Something has to hold the post until its time. Two things can:

| | Zernio (preferred) | Content Studio app |
|---|---|---|
| Holds the post | On Zernio's servers | In `.data/` on this machine |
| Fires when | Always | Only while `npm run dev` is running |
| On failure | 3 retries, exponential backoff, webhook | Nothing; it sits |
| Recurring slots | Yes, queue slots per profile | No, one time per post |
| Needs | Zernio connector authorized | The app running on localhost |

**Prefer Zernio.** Fall back to the app's queue only when Zernio is
unreachable, and say so when you do. Full contract and error handling:
[references/zernio.md](../instagram/references/zernio.md).

## Queue a post on Zernio

Resolve the Instagram `accountId` and its `profileId` from the connected
accounts list first — never hardcode them.

```json
POST /v1/posts
{
  "content": "caption text",
  "mediaItems": [{ "type": "image", "url": "https://..." }],
  "platforms": [{ "platform": "instagram", "accountId": "<accountId>" }],
  "queuedFromProfile": "<profileId>"
}
```

The response returns the assigned slot in `scheduledFor`. Report that time back
in the user's timezone, not UTC.

**A profile with no queue slots cannot queue.** `GET /v1/queue/slots` returning
404 means none are configured — a setup gap, not an outage. Offer to create a
schedule, or use an explicit `scheduledFor` + `timezone` in the meantime. See
[references/zernio.md](../instagram/references/zernio.md).

For a specific time the user named, send `scheduledFor` plus `timezone` instead
of `queuedFromProfile`. For "whenever's next", queue it.

**Never** read the next slot and pass it as `scheduledFor` — that bypasses queue
locking and two posts can land on the same slot. Preview a slot only to show
someone a time.

Media must be a public URL. Google Drive, Dropbox, OneDrive and iCloud links do
not work — they serve HTML, not a file.

## Managing what is queued

List posts filtered by `status` and `accountId` to show what is pending. A
queued post can be updated or deleted through the posts endpoints. Changing the
time of a queued post re-enters it into the queue; say the new time back.

## Confirm before queueing

A queued post is a post that will go out with nobody looking. Treat it with the
same care as publishing now: show the exact caption, the media, the kind, and
the local time it will fire, and get agreement.

For anything already published, there is no unsend.

If the same caption and media already went to this account within 24 hours,
Zernio rejects it (409) with the original post's id. Show the user the original
and ask — do not tweak the caption to force a duplicate through.

## Falling back to the app's queue

When Zernio is unreachable, the app's queue is the weaker substitute, and only
if the app is running:

```
POST /api/ig/schedule
{ "kind": "IMAGE", "caption": "...", "imageUrl": "https://...",
  "publishAt": "2026-09-02T18:00:00.000Z" }
```

`kind` is `IMAGE`, `REELS`, `STORIES` or `CAROUSEL`; `publishAt` null saves a
draft.

Read `GET /api/ig/schedule/run` before promising anything:

- **`autoPublish: true`** — it fires at its time unattended. Queueing *is* the
  approval.
- **`autoPublish: false`** — it waits until approved, however overdue.

`scheduler.active` and `lastRunAt` tell you whether the runner is alive. If it
is not, due posts will sit there — flag it.

**Tell the user they are on the fallback**, and that it only fires while the app
is up. If neither Zernio nor the app can hold the post, say plainly that nothing
is scheduled, and offer either to publish now or to keep the draft until Zernio
returns. Do not imply a post is queued when nothing is holding it.

## Cadence

`GET /api/ig/cadence` returns the target per week, posts in the last 7 and 30
days, days since the last post, the average gap, and how many are scheduled in
the next 7.

Report what it returns. Do not invent a "healthy" posting frequency; the target
is the user's own setting, changeable via `PUT /api/settings`.

When they are behind, say by how much and offer to draft or queue the shortfall
— do not queue anything uninvited.

For *when* to post rather than how often, see `instagram-insights` — Zernio
measures best times from real engagement. Do not guess an optimal hour.
