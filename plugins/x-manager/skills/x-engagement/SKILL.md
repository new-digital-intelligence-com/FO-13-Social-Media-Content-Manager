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
> **"The options don't fit the tool's format" is not a reason to fall back to
> prose.** Discrete paths always fit. Only when the answer is genuinely
> free-text — a caption, a search term — do you ask in words, and then ask for
> that one thing plainly. If no such tool exists at all, use a **numbered list**,
> one option per line.

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
