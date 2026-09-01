---
name: x-engagement
description: Engage on X - like, unlike, repost, bookmark, hide replies, follow, unfollow, mute and unmute, and see who liked, reposted or quoted a post. Use when the user wants to interact with posts or manage who they follow or mute.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../x/references/artifact.md](../x/references/artifact.md).

> **When you need a decision from the user, ask with the question form.** Use
> the AskUserQuestion tool so they pick from real options with the trade-off
> spelled out on each, rather than reading a paragraph that ends in a question
> mark. Three rules keep it useful: never ask what you can find out yourself —
> read the queue, the settings and the connection state first; make every option
> a genuine choice with its consequence stated, not "yes / no"; and put the one
> you would recommend first, saying why. Anything irreversible — publishing,
> arming an automation, deleting — is confirmed this way, never assumed.

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
