---
name: youtube-comments
description: Read, reply to and moderate YouTube comments. Use when the user wants to see comments on a video or channel, reply to viewers, triage engagement, or moderate spam and abuse.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../youtube/references/artifact.md](../youtube/references/artifact.md).

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
> **One question at a time — never a checklist.** When several things are still
> missing, do not list them and wait for the user to answer all four in one
> message. Ask the first, take the answer, ask the next. A numbered list of
> fields is the prose failure wearing a different hat.
>
> **If the answer is one of things you can look up, look them up first.** Never
> ask the user to paste an id, a link, or "tell me which one" for something you
> can fetch: list the account's recent posts, its reels, its playlists, its
> automations — whatever the question is about — and offer those as the options,
> each labelled so it is recognisable (the caption's first words and the date,
> not a bare id). Making the user go and find an id you could have fetched is
> the worst version of this failure, because they have to leave the conversation
> to answer you.
>
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For a genuinely open field — a keyword, a DM body, a name — draft
> two or three concrete candidates and offer those; the tool's own custom-answer
> path covers anything else. A blank ask makes the user do work you could have
> done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

# YouTube comments

## Reading

```
YOUTUBE_LIST_COMMENT_THREADS2  part           -> top-level threads
YOUTUBE_LIST_COMMENTS          parentId       -> replies under one thread
```

Pass `videoId` for one video, or `allThreadsRelatedToChannelId` for the whole
channel — the latter is the fast way to triage everything new.

`YOUTUBE_LIST_COMMENT_THREADS` (without the `2`) is **deprecated**; use
`THREADS2`.

Threads include a few replies inline, but not all of them. Fetch replies
explicitly when a conversation matters.

## Replying

```
YOUTUBE_CREATE_COMMENT_REPLY  parent_id, text   -> reply in a thread
YOUTUBE_POST_COMMENT          video_id, text    -> new top-level comment
YOUTUBE_UPDATE_COMMENT        id, text          -> edit your own
```

Replies are public and attributed to the channel. Show the exact text and get
agreement before posting. For a batch, present all drafts as one list for a
single approval, then report any individual failures.

Match the channel's existing voice — read recent replies before writing many.
Never invent facts about upload schedules, sponsors, products or future videos;
flag those for the owner instead of guessing.

## Moderation is about real people

```
YOUTUBE_DELETE_COMMENT                  id
YOUTUBE_MARK_COMMENT_AS_SPAM            id
YOUTUBE_SET_COMMENT_MODERATION_STATUS   id, moderationStatus [, banAuthor]
```

`moderationStatus` is `published`, `heldForReview` or `rejected`.

Rules:

- **Only moderate on explicit instruction.** Never on your own reading of
  sentiment.
- **List what would be affected and confirm**, item by item, before acting.
- **`banAuthor` is severe** — it blocks that person from the channel entirely.
  Never set it without the user explicitly asking for a ban.
- Criticism is not spam. Hiding negative feedback is the user's call to make
  knowingly; say what moderation will and will not achieve.

Deleting a comment is permanent and the author is not told.
