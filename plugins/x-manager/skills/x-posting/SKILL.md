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
