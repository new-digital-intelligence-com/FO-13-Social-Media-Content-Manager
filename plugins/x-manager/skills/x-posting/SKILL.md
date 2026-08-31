---
name: x-posting
description: Post to X - single posts, threads, replies, quote posts, media attachments and polls, plus deleting posts. Use when the user wants to tweet, post, publish a thread, reply, quote, attach an image or video, run a poll, or delete something they posted.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../x/references/artifact.md](../x/references/artifact.md).

# X posting

## Confirm before posting

A post is public and immediate, and deleting is permanent. Show the exact text
(and thread order) and get agreement before sending. Never delete on a vague
instruction — list what would go and confirm each one.

## Length

**280 characters** for a normal post. X counts URLs and unicode by its own
rules, so treat 280 as a hard ceiling and leave headroom. Content that does not
fit becomes a thread; never silently truncate.

## Single post

`TWITTER_CREATION_OF_A_POST` takes `text` plus optional structure:

- `reply: { in_reply_to_tweet_id }` — reply to a post
- `quote_tweet_id` — quote post
- `media: { media_ids }` — attach uploaded media
- `poll: { options, duration_minutes }` — 2–4 options
- `reply_settings` — `following` or `mentionedUsers` to limit who can reply
- `for_super_followers_only`

## Threads

There is no thread endpoint. A thread is successive replies: post the first,
take its id from the response, pass it as `reply.in_reply_to_tweet_id` on the
next, and repeat. If a middle post fails, stop and tell the user which parts
published — a half-posted thread is visible and needs a decision, not a retry
loop.

## Media

Upload first, then attach the returned `media_id`:

- `TWITTER_UPLOAD_MEDIA` for ordinary files
- `TWITTER_UPLOAD_LARGE_MEDIA`, or the
  `INITIALIZE` → `APPEND` → `GET_MEDIA_UPLOAD_STATUS` chunked sequence, for big
  video

Wait for the upload to report finished before posting; attaching a pending
`media_id` fails.

## Deleting

`TWITTER_POST_DELETE_BY_POST_ID` with `id`. Irreversible, and it does not
recall replies or reposts others have made.
