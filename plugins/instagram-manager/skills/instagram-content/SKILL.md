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
> **One question at a time — never a checklist.** When several things are still
> missing, do not list them and wait for the user to answer all four in one
> message. Ask the first, take the answer, ask the next. A numbered list of
> fields is the prose failure wearing a different hat.
>
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For an open field — a keyword, a DM body, a name — draft two or
> three concrete candidates from what you already know and offer those as the
> options; the tool's own custom-answer path covers anything else. A blank ask
> makes the user do work you could have done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

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
