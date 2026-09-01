---
name: instagram-content
description: Browse, search and audit existing Instagram posts, carousels, stories and live media. Use when the user wants to list recent posts, find a specific post, review captions or hashtags, check what is currently live or in stories, or audit their content library.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

> **When you need a decision from the user, ask with the question form.** Use
> the AskUserQuestion tool so they pick from real options with the trade-off
> spelled out on each, rather than reading a paragraph that ends in a question
> mark. Three rules keep it useful: never ask what you can find out yourself —
> read the queue, the settings and the connection state first; make every option
> a genuine choice with its consequence stated, not "yes / no"; and put the one
> you would recommend first, saying why. Anything irreversible — publishing,
> arming an automation, deleting — is confirmed this way, never assumed.

# Instagram content

Read the account's existing library. Everything here is read-only and safe to
run without confirmation.

## Listing posts

`INSTAGRAM_GET_IG_USER_MEDIA` (requires `ig_user_id`, accepts `"me"`) is the
entry point. Use it, not the deprecated `INSTAGRAM_GET_USER_MEDIA`.

**Pagination matters.** Default 25 per page, max 100. The response carries
`paging.cursors.after`; pass it as `after` to continue. Stopping at the first
page silently omits older posts -- for "all my posts" or any count, page to the
end and say how many you actually covered.

Filter a date range with `since`/`until` (Unix seconds, `since` < `until`).

**Request only the fields you need** via `fields`: `id`, `caption`,
`media_type`, `media_url`, `permalink`, `thumbnail_url`, `timestamp`,
`username`, `comments_count`, `like_count`, `is_comment_enabled`, `shortcode`.
Pulling everything for a large library wastes context.

## Individual media

```
INSTAGRAM_GET_IG_MEDIA           ig_media_id  -> one post
INSTAGRAM_GET_IG_MEDIA_CHILDREN  ig_media_id  -> carousel slides
```

A carousel's `media_url` is on the children, not the parent -- fetch children
when the individual slides matter.

## Stories and live

```
INSTAGRAM_GET_IG_USER_STORIES     -> active stories only
INSTAGRAM_GET_IG_USER_LIVE_MEDIA  -> live broadcasts
```

Stories expire after 24 hours and there is no API for expired ones. An empty
result means none are active right now, not that none were ever posted.

## Auditing well

- **State your coverage.** "Across the 25 most recent posts" is honest;
  presenting one page as the whole library is not.
- An account with `media_count: 0` has nothing to audit -- say so instead of
  producing an empty analysis.
- For caption and hashtag review, pull `caption` and count real usage rather
  than guessing at patterns.
- To rank by performance, combine with
  [instagram-insights](../instagram-insights/SKILL.md); `like_count` and
  `comments_count` alone miss reach, saves and shares.
- Quote captions as returned. Do not silently fix the user's typos or emoji.
