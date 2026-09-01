---
name: youtube-scheduling
description: Schedule YouTube uploads, manage the publishing queue, and drip-feed videos onto recurring slots. Use when the user wants a video to go live later, asks what is queued or publishing next, wants to reschedule or cancel a queued upload, or wants to space a batch of videos out.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../youtube/references/artifact.md](../youtube/references/artifact.md).

> **Never ask an open question in prose.** The moment you would write a
> sentence ending in "?" with options inside it, stop and ask with the
> **tappable question tool** instead, so the user clicks rather than reads and
> retypes. Its name differs by surface — **`ask_user_input_v0`** in the Claude
> app, **`AskUserQuestion`** in Claude Code — so use whichever one is in your
> toolset.
>
> This binds on the very first turn: invoked bare with no request, do **not**
> write "what would you like to do?" — read the current state first (connectors,
> what exists, what is live), show it, then offer the next step as options, one
> per real path.
>
> Each option names its consequence — "Publish now · visible immediately, no
> undo" beats "yes" — and the one you would recommend goes first, with the
> reason. Anything irreversible is confirmed this way, never assumed.
>
> **"The options don't fit the tool's format" is not a reason to fall back to
> prose.** Discrete paths always fit. Only when the answer is genuinely
> free-text — a caption, a search term — do you ask in words, and then ask for
> that one thing plainly. If no such tool exists at all, use a **numbered list**,
> one option per line.

# YouTube scheduling

Scheduled uploads live on **Zernio**. Composio publishes immediately; nothing in
the Data API holds a video for you. Contract and failure ladder:
[references/zernio.md](../youtube/references/zernio.md).

## What actually happens at schedule time

A scheduled YouTube post **uploads as private now and flips to public at the
slot time**. Two consequences worth saying out loud:

- The video is on the channel, private, before it is visible. A user who checks
  early will find it sitting there. That is expected, not a bug.
- The **quota is spent at upload**, not at publish. A scheduled upload costs its
  ~1600 units when it is created. Scheduling does not defer quota.

## Queue an upload

Resolve the YouTube `accountId` and its `profileId` from the connected accounts
list — never hardcode them.

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

`queuedFromProfile` takes the next free slot; `scheduledFor` + `timezone` takes
a named time. The response carries the assigned `scheduledFor` — report it in
the user's timezone.

**A profile with no queue slots cannot queue.** `GET /v1/queue/slots` returning
404 means none are configured — a setup gap, not an outage. Offer to create a
schedule, or use an explicit `scheduledFor` + `timezone` in the meantime. See
[references/zernio.md](../youtube/references/zernio.md).

**Never** preview the next slot and pass that time as `scheduledFor`. It
bypasses queue locking, and two uploads can take the same slot.

`platformSpecificData.title` is the video title. The top-level `title` field is
display-only and does **not** become the video title — a common and very visible
mistake. Without it, the title falls back to the first line of `content`.

## Drip-feeding a batch

To space out many videos, create them in a loop with `queuedFromProfile` and
each lands on the next free slot, in order. Do not compute the times yourself.

Before starting a batch, check the channel's remaining quota — a run of uploads
can exhaust a day's 10,000 units in six videos. If it will not fit, say how many
will and stop there rather than failing partway.

## Confirm before queueing

Show the title, the visibility, the description, the thumbnail, and the local
time it goes live, then get agreement.

The channel rules require **`visibility: "private"` unless the user explicitly
asks to publish** — the API's own default is `public`, so set it deliberately
every time.

`madeForKids: true` is permanent and disables comments, the bell, personalized
ads, end screens and cards forever. Never set it unasked.

A published video cannot be unpublished into never-having-existed; it can only
be made private or deleted, after notifications have already gone out.

## Managing the queue

List posts by `status` and `accountId` to show what is pending. Rescheduling
re-enters the post into the queue — say the new time back.

Identical content to the same channel within 24 h is rejected 409 with the
original post's id. Surface the original; a duplicate upload also burns another
~1600 units.

## When Zernio is unavailable

There is **no fallback** — the app's queue is Zernio, and the old local
scheduler was removed. Nothing can be scheduled during an outage. Say that
plainly, then offer an immediate upload as `private` for the user to publish by
hand, and be explicit that nothing is scheduled. Never claim a video is queued
when no service is holding it.

Uploads already scheduled are safe: they are held on Zernio, not in this app.

Never retry a failed upload blindly: the first attempt may have consumed quota
and partly succeeded. Check the channel first.
