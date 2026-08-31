---
name: youtube-growth
description: Playlists, subscriptions and YouTube discovery - create and curate playlists, manage subscriptions, search YouTube, and check trending or popular videos. Use when the user wants to organise videos into playlists, research a topic or competitor, or find what is popular.
---

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
