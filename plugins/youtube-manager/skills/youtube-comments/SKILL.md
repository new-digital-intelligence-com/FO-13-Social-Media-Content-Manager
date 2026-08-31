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
