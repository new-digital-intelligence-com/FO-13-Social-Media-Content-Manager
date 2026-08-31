---
name: x-engagement
description: Engage on X - like, unlike, repost, bookmark, hide replies, follow, unfollow, mute and unmute, and see who liked, reposted or quoted a post. Use when the user wants to interact with posts or manage who they follow or mute.
---

# X engagement

## Confirm before acting

Likes, reposts, follows and mutes are visible to others and attributed to the
account. Hiding a reply is visible to its author. Confirm before any of them,
and never run them in bulk from one vague approval — mass-follow and
mass-engagement behaviour gets accounts limited by X.

## The acting user id

Like and bookmark endpoints need the acting account's **numeric id**, not the
handle. Get it once from `TWITTER_USER_LOOKUP_ME` and reuse it.

## Actions

| Intent | Tool | Required |
|---|---|---|
| Like / unlike | `TWITTER_USER_LIKE_POST` / `TWITTER_UNLIKE_POST` | `id` (you), `tweet_id` |
| Repost | `TWITTER_RETWEET_POST` | `tweet_id` |
| Undo repost | `TWITTER_UNRETWEET_POST` | `source_tweet_id` |
| Bookmark | `TWITTER_ADD_POST_TO_BOOKMARKS` | `id` (you), `tweet_id` |
| Remove bookmark | `TWITTER_REMOVE_POST_FROM_BOOKMARKS` | `tweet_id` |
| Hide / unhide a reply | `TWITTER_HIDE_REPLIES` | `tweet_id`, `hidden` |
| Follow / unfollow | `TWITTER_FOLLOW_USER` / `TWITTER_UNFOLLOW_USER` | `target_user_id` |
| Mute / unmute | `TWITTER_MUTE_USER` / `TWITTER_UNMUTE_USER` | `target_user_id` |

Note the asymmetry: unretweet takes `source_tweet_id` and unbookmark takes only
`tweet_id`. Check the schema rather than assuming symmetry.

## Reading engagement

`TWITTER_LIST_POST_LIKERS`, `TWITTER_GET_POST_RETWEETERS_ACTION` and
`TWITTER_RETRIEVE_POSTS_THAT_QUOTE_A_POST` all take the post `id`. These are
read-only and safe.

Hiding replies is a moderation action, not a fix for criticism. If a user asks
to hide a wave of negative replies, say what it will and will not achieve and
let them decide.
