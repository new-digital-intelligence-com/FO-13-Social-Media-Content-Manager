# X toolkit inventory

Verified against Composio toolkit `TWITTER` (version `20260812_00`), 79 tools.
Auth: OAUTH2. **No Composio-managed app** — bring your own X credentials.

Discover at runtime with `COMPOSIO_SEARCH_TOOLS`; this list is for orientation.

## Account and graph

| Slug | Required |
|---|---|
| `TWITTER_USER_LOOKUP_ME` | — |
| `TWITTER_GET_USER_BY_ID` | `id` |
| `TWITTER_USER_LOOKUP_BY_USERNAME` | `username` |
| `TWITTER_USER_LOOKUP_BY_USERNAMES` | `usernames` |
| `TWITTER_GET_USERS_BY_IDS` | `ids` |
| `TWITTER_FOLLOWERS_BY_USER_ID` | `id` |
| `TWITTER_FOLLOWING_BY_USER_ID` | `id` |
| `TWITTER_FOLLOW_USER` / `TWITTER_UNFOLLOW_USER` | `target_user_id` |
| `TWITTER_MUTE_USER` / `TWITTER_UNMUTE_USER` | `target_user_id` |
| `TWITTER_GET_MUTED_USERS` / `TWITTER_GET_BLOCKED_USERS` | `id` |
| `TWITTER_GET_POST_USAGE` | — |

## Posting and media

| Slug | Required |
|---|---|
| `TWITTER_CREATION_OF_A_POST` | — (text, reply, quote, media, poll) |
| `TWITTER_POST_DELETE_BY_POST_ID` | `id` |
| `TWITTER_UPLOAD_MEDIA` | `media` |
| `TWITTER_UPLOAD_LARGE_MEDIA` | `media` |
| `TWITTER_INITIALIZE_MEDIA_UPLOAD` | `total_bytes` |
| `TWITTER_APPEND_MEDIA_UPLOAD` | `id`, `media`, `segment_index` |
| `TWITTER_GET_MEDIA_UPLOAD_STATUS` | `media_id` |

## Reading

| Slug | Required |
|---|---|
| `TWITTER_USER_HOME_TIMELINE_BY_USER_ID` | — |
| `TWITTER_POST_LOOKUP_BY_POST_ID` / `_IDS` | `id` / `ids` |
| `TWITTER_BOOKMARKS_BY_USER` | — |
| `TWITTER_RETURNS_POST_OBJECTS_LIKED_BY_THE_PROVIDED_USER_ID` | `id` |

## Engagement

| Slug | Required |
|---|---|
| `TWITTER_USER_LIKE_POST` / `TWITTER_UNLIKE_POST` | `id`, `tweet_id` |
| `TWITTER_RETWEET_POST` | `tweet_id` |
| `TWITTER_UNRETWEET_POST` | `source_tweet_id` |
| `TWITTER_ADD_POST_TO_BOOKMARKS` | `id`, `tweet_id` |
| `TWITTER_REMOVE_POST_FROM_BOOKMARKS` | `tweet_id` |
| `TWITTER_HIDE_REPLIES` | `tweet_id`, `hidden` |
| `TWITTER_LIST_POST_LIKERS` | `id` |
| `TWITTER_GET_POST_RETWEETERS_ACTION` / `TWITTER_GET_POST_RETWEETS` | `id` |
| `TWITTER_RETRIEVE_POSTS_THAT_QUOTE_A_POST` | `id` |

## Search and analytics

| Slug | Required | Notes |
|---|---|---|
| `TWITTER_RECENT_SEARCH` | `query` | ~last 7 days on most plans |
| `TWITTER_FULL_ARCHIVE_SEARCH` | `query` | Higher access tier required |
| `TWITTER_SEARCH_RECENT_COUNTS` | `query` | Volume only |
| `TWITTER_SEARCH_FULL_ARCHIVE_COUNTS` | `query` | Higher tier |
| `TWITTER_GET_POST_ANALYTICS` | `ids`, `start_time`, `end_time` | |

## Lists

`TWITTER_CREATE_LIST` (`name`), `TWITTER_UPDATE_LIST` (`id`),
`TWITTER_DELETE_LIST` (`id`), `TWITTER_GET_LIST` (`id`),
`TWITTER_GET_LIST_MEMBERS` (`id`), `TWITTER_GET_LIST_FOLLOWERS` (`id`),
`TWITTER_ADD_LIST_MEMBER` / `TWITTER_REMOVE_LIST_MEMBER` (`id`, `user_id`),
`TWITTER_FOLLOW_LIST` / `TWITTER_UNFOLLOW_LIST` (`id`, `list_id`),
`TWITTER_PIN_LIST` (`id`, `list_id`), `TWITTER_UNPIN_LIST` (`list_id`),
`TWITTER_GET_USER_OWNED_LISTS` / `_FOLLOWED_LISTS` / `_PINNED_LISTS` /
`_LIST_MEMBERSHIPS` (`id`), `TWITTER_LIST_POSTS_TIMELINE_BY_LIST_ID` (`id`).

## Direct messages

`TWITTER_GET_RECENT_DM_EVENTS` (—), `TWITTER_GET_DM_CONVERSATION_EVENTS`
(`participant_id`), `TWITTER_RETRIEVE_DM_CONVERSATION_EVENTS` (`id`),
`TWITTER_GET_DM_EVENT` (`event_id`), `TWITTER_DELETE_DM` (`event_id`),
`TWITTER_SEND_A_NEW_MESSAGE_TO_A_USER` (`participant_id`),
`TWITTER_SEND_DM_TO_CONVERSATION` (`dm_conversation_id`),
`TWITTER_CREATE_DM_CONVERSATION` (`conversation_type`, `participant_ids`, `message`).

## Spaces

`TWITTER_SEARCH_SPACES` (`query`), `TWITTER_GET_SPACE_BY_ID` (`id`),
`TWITTER_GET_SPACES_BY_IDS` (`ids`), `TWITTER_GET_SPACES_BY_CREATORS`
(`user_ids`), `TWITTER_GET_SPACE_POSTS` (`id`), `TWITTER_GET_SPACE_TICKET_BUYERS` (`id`).

## Compliance and infrastructure

`TWITTER_CREATE_COMPLIANCE_JOB`, `TWITTER_GET_COMPLIANCE_JOB(S)`,
`TWITTER_STREAM_POST_LABELS`, `TWITTER_CREATE_ACTIVITY_SUBSCRIPTION`,
`TWITTER_GET_OPENAPI_SPEC`.
