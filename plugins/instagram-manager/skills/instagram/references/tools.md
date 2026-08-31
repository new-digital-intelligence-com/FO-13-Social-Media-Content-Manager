# Instagram toolkit inventory

Verified against Composio toolkit `INSTAGRAM` (version `20260819_00`).
Auth: OAUTH2, Composio-managed app available. Business/Creator accounts only.

Discover at runtime with `COMPOSIO_SEARCH_TOOLS` and confirm arguments with
`COMPOSIO_GET_TOOL_SCHEMAS`; this list is for orientation, not a substitute.

## Account

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_GET_USER_INFO` | none | `ig_user_id` defaults to `"me"`. Source of the numeric IG User ID. `followers_count`/`follows_count` only populated for `"me"`. |
| `INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT` | none | Posts used against the rolling 24h quota (25). |

## Content

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_GET_IG_USER_MEDIA` | `ig_user_id` | Paginated. `limit` max 100. Use `after` cursor; stopping at page 1 silently omits older posts. |
| `INSTAGRAM_GET_IG_MEDIA` | `ig_media_id` | Single media object. |
| `INSTAGRAM_GET_IG_MEDIA_CHILDREN` | `ig_media_id` | Carousel slides. |
| `INSTAGRAM_GET_IG_USER_STORIES` | none | Active stories only (24h). |
| `INSTAGRAM_GET_IG_USER_LIVE_MEDIA` | none | Live broadcasts. |

## Publishing

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_POST_IG_USER_MEDIA` | `ig_user_id` | Creates a container. Needs one of `image_url`, `video_url`, `image_file`, `video_file`, `children`. `media_type`: `REELS`, `CAROUSEL`, `STORIES`. |
| `INSTAGRAM_CREATE_CAROUSEL_CONTAINER` | `ig_user_id` | Parent for 2-10 child containers. |
| `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` | `ig_user_id`, `creation_id` | Publishes a finished container. |

Deprecated: `INSTAGRAM_CREATE_POST`, `INSTAGRAM_CREATE_MEDIA_CONTAINER`,
`INSTAGRAM_GET_POST_STATUS`.

## Comments and mentions

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_GET_IG_MEDIA_COMMENTS` | `ig_media_id` | Top-level comments. |
| `INSTAGRAM_GET_IG_COMMENT_REPLIES` | `ig_comment_id` | Replies under a comment. |
| `INSTAGRAM_POST_IG_MEDIA_COMMENTS` | `ig_media_id`, `message` | New top-level comment. |
| `INSTAGRAM_POST_IG_COMMENT_REPLIES` | `ig_comment_id`, `message` | Reply to a comment. |
| `INSTAGRAM_DELETE_COMMENT` | `ig_comment_id` | Irreversible. |
| `INSTAGRAM_POST_IG_USER_MENTIONS` | `ig_user_id`, `media_id`, `message` | Reply where you were @mentioned. |

Deprecated: `INSTAGRAM_GET_POST_COMMENTS`, `INSTAGRAM_REPLY_TO_COMMENT`.

## Messaging

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_LIST_ALL_CONVERSATIONS` | none | Inbox. |
| `INSTAGRAM_GET_PAGE_CONVERSATIONS` | `ig_user_id` | Conversations for the linked Page. |
| `INSTAGRAM_GET_CONVERSATION` | `conversation_id` | One thread. |
| `INSTAGRAM_LIST_ALL_MESSAGES` | `conversation_id` | Messages in a thread. |
| `INSTAGRAM_SEND_TEXT_MESSAGE` | `recipient_id`, `text` | Subject to Meta's 24h messaging window. |
| `INSTAGRAM_SEND_IMAGE` | `recipient_id`, `image_url` | Public URL required. |
| `INSTAGRAM_MARK_SEEN` | `recipient_id` | Marks thread read. |
| `INSTAGRAM_GET_MESSENGER_PROFILE` | `ig_user_id` | Ice breakers, persistent menu. |
| `INSTAGRAM_UPDATE_MESSENGER_PROFILE` | `ig_user_id`, `ice_breakers` | |
| `INSTAGRAM_DELETE_MESSENGER_PROFILE` | `ig_user_id`, `fields` | |

## Insights

| Slug | Required | Notes |
|---|---|---|
| `INSTAGRAM_GET_USER_INSIGHTS` | none | Account level. See the insights skill for the metric/period/timeframe rules. |
| `INSTAGRAM_GET_IG_MEDIA_INSIGHTS` | `ig_media_id`, `metric` | Per-post. Always lifetime. |

Deprecated: `INSTAGRAM_GET_POST_INSIGHTS`.
