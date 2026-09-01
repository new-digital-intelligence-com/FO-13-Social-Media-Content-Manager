---
name: youtube-growth
description: Playlists, subscriptions and YouTube discovery - create and curate playlists, manage subscriptions, search YouTube, and check trending or popular videos. Use when the user wants to organise videos into playlists, research a topic or competitor, or find what is popular.
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

# YouTube growth

## Playlists

| Intent | Tool | Required |
|---|---|---|
| Create | `YOUTUBE_CREATE_PLAYLIST` | `title` |
| Update | `YOUTUBE_UPDATE_PLAYLIST` | `id`, `snippet` |
| Delete | `YOUTUBE_DELETE_PLAYLIST` | `id` |
| List mine | `YOUTUBE_LIST_USER_PLAYLISTS` | — |
| List contents | `YOUTUBE_LIST_PLAYLIST_ITEMS` | — |
| Add a video | `YOUTUBE_ADD_VIDEO_TO_PLAYLIST` | — |
| Reorder / move | `YOUTUBE_UPDATE_PLAYLIST_ITEM` | `id`, `snippet` |
| Remove | `YOUTUBE_DELETE_PLAYLIST_ITEM` | `id` |

**The id trap:** removing a video takes the **playlist item id**, not the video
id. The same video in two playlists has two different item ids. Read the
playlist first to get them.

Deleting a playlist is permanent and breaks any link pointing at it. Confirm
first.

## Subscriptions

`YOUTUBE_LIST_USER_SUBSCRIPTIONS`, `YOUTUBE_SUBSCRIBE_CHANNEL`,
`YOUTUBE_UNSUBSCRIBE_CHANNEL`.

Subscribing is a public action attributed to the channel. Confirm first, and
never mass-subscribe — it reads as spam behaviour.

## Search — mind the quota

`YOUTUBE_SEARCH_YOU_TUBE` (`q`) costs **~100 quota units per call**, versus 1-3
for a list. On a default 10,000/day allowance that is a hundred searches and
nothing else.

So:

- To read the channel's own videos, use `YOUTUBE_LIST_CHANNEL_VIDEOS`, not
  search.
- To resolve a handle, use `YOUTUBE_GET_CHANNEL_ID_BY_HANDLE`, not search.
- Batch what you can: `YOUTUBE_GET_VIDEO_DETAILS_BATCH` takes many ids in one
  call.

Useful search params: `type` (`video`/`channel`/`playlist`), `order`
(`relevance`, `date`, `viewCount`, `rating`).

## Discovery

`YOUTUBE_LIST_MOST_POPULAR_VIDEOS` (region-specific) shows what is trending;
`YOUTUBE_LIST_VIDEO_CATEGORIES` gives the region's category ids. Uploads
default to `22` and do not prompt for one — see
[youtube-publishing](../youtube-publishing/SKILL.md).

Trending is heavily regional — always state which region you queried. Do not
present one region's trending as a global signal.
