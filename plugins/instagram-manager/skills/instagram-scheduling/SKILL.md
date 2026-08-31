---
name: instagram-scheduling
description: Schedule Instagram posts, manage the publishing queue, and keep a consistent posting cadence. Use when the user wants to schedule or queue a post, asks what is queued or going out next, wants to change or cancel a scheduled post, or asks whether they are posting often enough.
---

# Instagram scheduling

## Instagram has no scheduling API

Nothing in the toolkit queues a post for later. `INSTAGRAM_POST_IG_USER_MEDIA`
creates a container and `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` publishes it —
both immediate. Containers also expire in under 24 hours, so creating one early
is not a scheduling mechanism.

Scheduling therefore lives in the Content Studio app, which keeps its own queue
and a server-side runner. See
[references/app-api.md](../instagram/references/app-api.md).

**If the app is not running, say so.** Do not imply a post is queued when
nothing is holding it.

## Queueing a post

```
POST /api/ig/schedule
{ "kind": "IMAGE", "caption": "...", "imageUrl": "https://...",
  "publishAt": "2026-09-02T18:00:00.000Z" }
```

- `kind` is `IMAGE`, `REELS`, `STORIES` or `CAROUSEL`
- `publishAt` is ISO 8601; `null` saves it as a draft with no date
- Media must be a public URL — host a local file first via `POST /api/media`

## Two modes, and they differ in what happens next

Read `GET /api/ig/schedule/run` before promising anything:

- **`autoPublish: true`** — the post fires at its time with no further input.
  Queueing *is* the approval. Tell the user it will publish unattended.
- **`autoPublish: false`** — the post waits until approved, however overdue.
  Say clearly that it will not go out until they approve it.

The response also carries `scheduler.active` and `lastRunAt`. If the scheduler
is inactive, due posts will sit there — worth flagging rather than assuming.

## Confirm before queueing

A queued post under auto-publish is a post that will go out with nobody
looking. Treat it with the same care as publishing now: show the exact caption,
the media, the kind, and the local time it will fire, and get agreement.

For anything already published, there is no unsend.

## Cadence

`GET /api/ig/cadence` returns the target per week, posts in the last 7 and 30
days, days since the last post, the average gap, and how many are scheduled in
the next 7.

Report what it returns. Do not invent a "healthy" posting frequency; the target
is the user's own setting, changeable via `PUT /api/settings`.

When they are behind, say by how much and offer to draft or queue the shortfall
— do not queue anything uninvited.
