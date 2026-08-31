---
name: x-lists
description: Create and curate X lists - create, update, delete, add or remove members, follow, pin, and read a list's timeline. Use when the user wants to organise accounts into lists or read from one.
---

# X lists

Lists are the cheapest way to follow a topic without following accounts.

## Confirm before changing

Adding or removing members and deleting a list are visible to the people
involved (a member sees they were added to a public list). Deleting is
permanent. Confirm first.

## Managing

| Intent | Tool | Required |
|---|---|---|
| Create | `TWITTER_CREATE_LIST` | `name` |
| Update | `TWITTER_UPDATE_LIST` | `id` |
| Delete | `TWITTER_DELETE_LIST` | `id` |
| Add member | `TWITTER_ADD_LIST_MEMBER` | `id`, `user_id` |
| Remove member | `TWITTER_REMOVE_LIST_MEMBER` | `id`, `user_id` |
| Follow / unfollow | `TWITTER_FOLLOW_LIST` / `TWITTER_UNFOLLOW_LIST` | `id`, `list_id` |
| Pin / unpin | `TWITTER_PIN_LIST` / `TWITTER_UNPIN_LIST` | `id`, `list_id` / `list_id` |

Create takes `private` to keep a list hidden — use it when curating
competitors or research, since a public list announces who you are watching.

## Reading

`TWITTER_GET_LIST` (`id`), `TWITTER_GET_LIST_MEMBERS` (`id`),
`TWITTER_GET_LIST_FOLLOWERS` (`id`), and
`TWITTER_LIST_POSTS_TIMELINE_BY_LIST_ID` (`id`) for the list's posts.

For a user's own lists: `TWITTER_GET_USER_OWNED_LISTS`,
`TWITTER_GET_USER_FOLLOWED_LISTS`, `TWITTER_GET_USER_PINNED_LISTS` and
`TWITTER_GET_USER_LIST_MEMBERSHIPS` — all keyed by the user `id`.

Members are added by **numeric user id**, so resolve handles first with
`TWITTER_USER_LOOKUP_BY_USERNAME`.
