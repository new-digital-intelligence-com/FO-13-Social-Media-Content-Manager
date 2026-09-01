---
name: instagram-engagement
description: Read, reply to, and moderate Instagram comments and mentions. Use when the user wants to see comments on a post, reply to followers, handle mentions, moderate or delete comments, or triage engagement across recent posts.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

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

# Instagram engagement

Comments and mentions are public and attributed to the account. Treat every
write as something a real audience will see.

## Confirm before writing

Posting a comment, replying, or deleting is public and immediate. Show the exact
text and where it will appear, then get agreement. Deletion is irreversible --
never delete on a vague instruction like "clean up the comments"; list what you
would remove and confirm each.

## Reading

```
INSTAGRAM_GET_IG_MEDIA_COMMENTS   ig_media_id   -> top-level comments
INSTAGRAM_GET_IG_COMMENT_REPLIES  ig_comment_id -> replies under one comment
```

Top-level comments do not include replies -- fetch replies separately when
threads matter. Get `ig_media_id` from `INSTAGRAM_GET_IG_USER_MEDIA`.

Use `INSTAGRAM_GET_IG_MEDIA_COMMENTS`, not the deprecated
`INSTAGRAM_GET_POST_COMMENTS`.

## Writing

```
INSTAGRAM_POST_IG_MEDIA_COMMENTS   ig_media_id + message    -> new comment
INSTAGRAM_POST_IG_COMMENT_REPLIES  ig_comment_id + message  -> threaded reply
INSTAGRAM_POST_IG_USER_MENTIONS    ig_user_id + media_id + message
INSTAGRAM_DELETE_COMMENT           ig_comment_id
```

Replying to a follower uses `INSTAGRAM_POST_IG_COMMENT_REPLIES` (the deprecated
name is `INSTAGRAM_REPLY_TO_COMMENT`). `INSTAGRAM_POST_IG_USER_MENTIONS` is for
responding where the account was @mentioned in someone else's media or comment.

## Drafting replies

- Match the account's existing voice -- read recent replies before writing new
  ones in bulk.
- Draft in the user's language, not the tool's.
- For a batch, show all drafts as a list for one approval rather than asking per
  comment; then send and report failures individually.
- Do not invent facts about products, prices, shipping or availability. If a
  comment asks something you cannot verify, flag it for the user instead of
  guessing.

## When comment tools fail

A permission error usually means the Meta app lacks
`instagram_manage_comments` (Facebook Login) or
`instagram_business_manage_comments` (Instagram Business Login). Meta must
approve those on the app. The Composio-managed app may not carry them -- the
production unblock is your own Meta app. See
[instagram-setup](../instagram-setup/SKILL.md).
