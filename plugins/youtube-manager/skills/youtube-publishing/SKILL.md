---
name: youtube-publishing
description: Upload videos to YouTube and manage their metadata - titles, descriptions, tags, thumbnails, privacy and categories. Use when the user wants to upload, publish, schedule, retitle, rewrite a description, change a thumbnail, or delete a video.
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

# YouTube publishing

## Confirm before every write, and default to private

An upload can notify subscribers and cannot be un-notified. **Upload as
`private` unless the user explicitly asks to publish**, then let them review
and flip it. Show the exact title, description and privacy before uploading.

Deleting a video is **permanent** and takes its views, comments and inbound
links with it. Never delete on a vague instruction.

## Uploading — use the multipart tool

**Use `YOUTUBE_MULTIPART_UPLOAD_VIDEO`, not `YOUTUBE_UPLOAD_VIDEO`.**

`YOUTUBE_UPLOAD_VIDEO` returns success and creates the video on the channel,
but the file YouTube receives is unusable: every upload ends as *"processing
abandoned"* in Studio. This was verified against a known-good video that the
multipart tool then published from the identical staged file. The failure is
invisible from the API — a failed video never enters the uploads playlist, so
listing the channel shows nothing at all.

Note the differences between the two tools:

| | `MULTIPART_UPLOAD_VIDEO` (use this) | `UPLOAD_VIDEO` (broken) |
|---|---|---|
| File argument | `videoFile` | `videoFilePath` |
| Response shape | `{ video: { id } }` | `{ id }` under `response_data` |

Stage the file with the same tool slug you are going to call; the storage key
is scoped per tool.

Required: `title`, `description`, `categoryId`, `privacyStatus`, `videoFile`.
An empty tag list is rejected. Uploads cost ~1600 quota units, so a failed one
is expensive — validate before sending.

**Do not ask the user for a category.** The API requires the field but
youtube.com never asks for it at upload time, so default to `22`
(People & Blogs) and move on. It is editable afterwards with
`YOUTUBE_UPDATE_VIDEO`. Only ask if the user raises it themselves, or set it
knowingly when the fit is obvious (`10` Music, `20` Gaming, `27` Education,
`28` Science & Tech). `YOUTUBE_LIST_VIDEO_CATEGORIES` has the region-specific
list. The app's upload panel omits the field for this reason.

## Shorts

There is no Shorts flag anywhere in the toolkit. YouTube classifies a video as
a Short from the file itself: roughly **3 minutes or under** and **taller than
it is wide**. A qualifying upload lands under Shorts in Studio, not Videos —
which looks like a failed upload if you are not expecting it.

So do not promise a Short, describe what the file will produce. Check the
duration and dimensions before uploading and say which it will be. Appending
`#Shorts` to the description is a hint only; it does not override the file.
The app's upload panel mirrors this: an intent selector, the file's measured
verdict, and a warning when the two disagree.

## Metadata that actually matters

- **Title** — under 60 characters stays readable in search and suggested.
  Specific beats clever. Never fabricate numbers or claims to bait clicks.
- **Description** — the first two lines show above the fold; put the substance
  there. Max 5,000 characters.
- **Chapters** live in the description as `M:SS Title` lines, first one `0:00`,
  minimum three, in ascending order. YouTube ignores malformed lists silently.
- **Tags** — 10-15, mixing broad and specific. Low impact these days; do not
  stuff.

**Write metadata from the transcript, not the filename.** See
[youtube-content](../youtube-content/SKILL.md).

## Editing published videos

`YOUTUBE_UPDATE_VIDEO` (`video_id`) changes title, description, tags, privacy
or category. Warn the user before rewriting the title or description of a video
that is performing — it can disturb its search and suggested placement.

`YOUTUBE_UPDATE_THUMBNAIL` replaces the custom thumbnail. This requires a
verified channel; on an unverified one it fails with a permissions error that
looks like a scope problem but is not.

## Scheduling

The Data API has no scheduling in this toolkit. "Schedule this for Friday"
means uploading as `private` now and flipping to `public` later from the
caller's own job store. Say so rather than implying it is queued.
