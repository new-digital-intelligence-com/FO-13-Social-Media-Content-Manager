# YouTube toolkit inventory

Verified against Composio toolkit `YOUTUBE` (version `20260721_00`), 51 tools
and 4 triggers. Auth: OAUTH2, managed app available.

## Channel

`YOUTUBE_LIST_CHANNELS` (`mine: true`), `YOUTUBE_GET_CHANNEL_STATISTICS`,
`YOUTUBE_GET_CHANNEL_ID_BY_HANDLE` (`channel_handle`),
`YOUTUBE_UPDATE_CHANNEL` (`id`), `YOUTUBE_GET_CHANNEL_ACTIVITIES`,
`YOUTUBE_LIST_CHANNEL_SECTIONS` (`part`), `YOUTUBE_CREATE_CHANNEL_SECTION`
(`snippet`), `YOUTUBE_UPDATE_CHANNEL_SECTION` (`id`),
`YOUTUBE_DELETE_CHANNEL_SECTION` (`id`).

## Videos

| Slug | Required | Notes |
|---|---|---|
| `YOUTUBE_LIST_CHANNEL_VIDEOS` | — | The channel's uploads |
| `YOUTUBE_GET_VIDEO_DETAILS_BATCH` | `id` | Comma-separated ids; needs `part` |
| `YOUTUBE_UPLOAD_VIDEO` | `title`, `description`, `tags` | ~1600 quota units |
| `YOUTUBE_MULTIPART_UPLOAD_VIDEO` | `title`, `description` | Larger files |
| `YOUTUBE_UPDATE_VIDEO` | `video_id` | Title, description, tags, privacy |
| `YOUTUBE_DELETE_VIDEO` | — | Permanent |
| `YOUTUBE_UPDATE_THUMBNAIL` | — | Custom thumbnail |
| `YOUTUBE_RATE_VIDEO` / `YOUTUBE_GET_VIDEO_RATING` | `id` | like/dislike/none |

## Captions — the transcript

`YOUTUBE_LIST_CAPTION_TRACK` (`video_id`) lists tracks;
`YOUTUBE_LOAD_CAPTIONS` (`id`, a **track** id) returns the text;
`YOUTUBE_UPDATE_CAPTION` (`id`, `snippet`) edits one.

## Playlists

`YOUTUBE_CREATE_PLAYLIST` (`title`), `YOUTUBE_UPDATE_PLAYLIST` (`id`,
`snippet`), `YOUTUBE_DELETE_PLAYLIST` (`id`), `YOUTUBE_LIST_USER_PLAYLISTS`,
`YOUTUBE_LIST_PLAYLIST_ITEMS`, `YOUTUBE_ADD_VIDEO_TO_PLAYLIST`,
`YOUTUBE_UPDATE_PLAYLIST_ITEM` (`id`, `snippet`),
`YOUTUBE_DELETE_PLAYLIST_ITEM` (`id` — the **item** id, not the video id),
`YOUTUBE_LIST_PLAYLIST_IMAGES`.

## Comments

`YOUTUBE_LIST_COMMENT_THREADS2` (`part`) — current;
`YOUTUBE_LIST_COMMENT_THREADS` is **deprecated**.
`YOUTUBE_LIST_COMMENTS` (replies via `parentId`), `YOUTUBE_POST_COMMENT`,
`YOUTUBE_CREATE_COMMENT_REPLY`, `YOUTUBE_UPDATE_COMMENT` (`id`),
`YOUTUBE_DELETE_COMMENT` (`id`), `YOUTUBE_MARK_COMMENT_AS_SPAM` (`id`),
`YOUTUBE_SET_COMMENT_MODERATION_STATUS` (`id`).

## Discovery and subscriptions

`YOUTUBE_SEARCH_YOU_TUBE` (`q`), `YOUTUBE_LIST_MOST_POPULAR_VIDEOS`,
`YOUTUBE_LIST_VIDEO_CATEGORIES`, `YOUTUBE_LIST_USER_SUBSCRIPTIONS`,
`YOUTUBE_SUBSCRIBE_CHANNEL`, `YOUTUBE_UNSUBSCRIBE_CHANNEL`.

## Live and misc

`YOUTUBE_LIST_LIVE_CHAT_MESSAGES`, `YOUTUBE_LIST_SUPER_CHAT_EVENTS`,
`YOUTUBE_LIST_I18N_LANGUAGES`, `YOUTUBE_LIST_I18N_REGIONS`,
`YOUTUBE_LIST_VIDEO_ABUSE_REPORT_REASONS`, `YOUTUBE_REPORT_VIDEO_ABUSE`.

## Triggers

`YOUTUBE_NEW_ACTIVITY_TRIGGER`, `YOUTUBE_NEW_PLAYLIST_ITEM_TRIGGER`,
`YOUTUBE_NEW_PLAYLIST_TRIGGER`, `YOUTUBE_NEW_SUBSCRIPTION_TRIGGER`.

## Not in this toolkit

Watch time, retention and revenue come from the **YouTube Analytics API**,
which is separate and not exposed here. The Data API's `statistics` gives view,
like and comment counts only.
