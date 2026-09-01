---
name: instagram-publishing
description: Publish content to Instagram - single images, videos, reels, stories and carousels. Use when the user wants to post, publish, upload, share, or schedule Instagram content, or asks about publishing limits, captions, hashtags, alt text, tagging or cover images.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

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

# Instagram publishing

Publishing is always **two steps**: create a container, then publish it.
A container is a draft; nothing is public until the publish call succeeds.

## Confirm before you publish

A publish is visible to real followers and effectively irreversible. Before the
publish call, show the user the exact caption, the media URL, and the media type,
and get explicit agreement. Creating a container is safe and needs no
confirmation -- publishing does.

## The core flow

```
INSTAGRAM_POST_IG_USER_MEDIA          -> returns a container id (creation_id)
INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH  -> ig_user_id + creation_id -> live post
```

`ig_user_id` may be `"me"`. Containers expire in under 24 hours, so publish
promptly.

## Media requirements

Meta fetches the media **server-side**, so the URL must be publicly reachable:

- `image_url` -- public HTTP/HTTPS JPEG. Signed CDN URLs work while valid.
- `video_url` -- public HTTP/HTTPS MP4.
- Localhost, private networks, and URLs needing auth headers all fail.
- If the user has only a local file, `image_file`/`video_file` upload it to a
  temporary public URL for you. Never invent a URL, and never substitute a stock
  image the user did not ask for -- ask for the real one.

## Per-type recipes

**Single image** -- `image_url` + `caption`. Optionally `alt_text` (max 1,000
chars; images only). Then publish.

**Reel** -- `media_type: "REELS"` with `video_url`. Optional: `cover_url`,
`thumb_offset` (ms), `audio_name`, `share_to_feed` to appear in both the Feed
and Reels tabs.

**The Reel cover is URL-only.** `cover_url` takes a public HTTP/HTTPS image URL
and there is **no `cover_file` parameter** -- unlike the main media, which
accepts `image_file` / `video_file`. An uploaded cover image cannot be used.
Either give a public URL, or use `thumb_offset` to select a frame from the video
itself. Never pass a staged file object as `cover_url`; it is typed as a string
and the cover is silently dropped.

**Story** -- `media_type: "STORIES"` with `image_url` or `video_url`. Stories
expire after 24 hours.

**Carousel** -- 2 to 10 items:
1. Create each child with `is_carousel_item: true`.
2. Wait until every child reports finished; a pending or failed child blocks the
   parent.
3. Create the parent with `INSTAGRAM_CREATE_CAROUSEL_CONTAINER` (or
   `media_type: "CAROUSEL"`) passing `children` in slide order.
4. Publish the parent.

## Captions, hashtags and tagging

- Caption max 2,200 characters, max 30 hashtags.
- Encode `#` as `%23` in the caption field.
- `user_tags` -- for images, `x`/`y` coordinates (0.0-1.0 from top-left) are
  required. For Reels, only `username` is allowed and coordinates are rejected.
- `location_id` is a Facebook Page ID and the Page must have lat/long data.

## Respect the publishing quota

Instagram caps published posts per rolling 24 hours, but **the limit varies by
account** -- do not assume a number. Read it from
`INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT`, which returns
`config.quota_total`, `config.quota_duration` (seconds) and `quota_usage`.
Check before a batch and tell the user their real remaining quota rather than
failing partway through a series.

## Scheduling

Instagram's API has no native scheduling. "Schedule this for Friday" means
something in the user's own system must hold the job and call publish later.
Say so plainly instead of implying the post is queued.
