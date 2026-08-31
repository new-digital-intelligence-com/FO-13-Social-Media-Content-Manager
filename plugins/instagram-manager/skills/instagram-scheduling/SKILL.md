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

**Zernio holds it.** It keeps the post on its own servers, fires it at the slot
time, and retries three times with exponential backoff. The app does not need to
be running.

The Content Studio app used to keep its own `.data/` queue driven by an
in-process timer. That is gone: it only published while `npm run dev` happened
to be running, so a "scheduled" post silently missed its time whenever the app
was down. The app's Queue tab now reads and writes Zernio.

**So there is no second scheduler.** If Zernio is unreachable, nothing can be
scheduled — say so rather than implying a post is held somewhere. Full contract
and error handling: [references/zernio.md](../instagram/references/zernio.md).

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

## Through the app instead

The app's Queue tab is a view onto the same Zernio queue, so either route works
and both show the same posts:

```
GET    /api/ig/schedule?platform=instagram   posts + counts, and `available`
POST   /api/ig/schedule                      {caption, mediaUrl, publishAt|useQueue, timezone}
PATCH  /api/ig/schedule                      {id, publishAt}  — null returns it to a draft
DELETE /api/ig/schedule?id=
```

**`available: false` is not an empty queue.** It means Zernio could not be read,
so what is scheduled is unknown. Never report "nothing scheduled" from it.

There is no approval step and no `/api/ig/schedule/run` — both are gone.
Setting a time *is* the approval; a post with no date stays a draft and never
publishes.

## When Zernio is unreachable

Nothing can be scheduled — there is no second queue to fall back to. Say that
plainly, then offer the two things that still work: publish now through
Composio, or keep it as a draft until Zernio returns. Ask which; do not choose.

Posts already scheduled are safe — they are held on Zernio, not in this app.
Do not tell the user their queue is at risk.

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
