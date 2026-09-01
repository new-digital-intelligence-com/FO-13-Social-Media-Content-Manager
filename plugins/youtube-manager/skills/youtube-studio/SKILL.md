---
name: youtube-studio
description: Turn a YouTube video into other content using its transcript - summaries, chapters, descriptions, titles, tags, and posts repurposed for Instagram or X. Use when the user asks what a video covers, wants chapters or a description written, wants titles or tags, or wants a video turned into posts for other platforms.
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

# YouTube studio

Every task here is a transformation of the **transcript**. Load it first; see
[youtube-content](../youtube-content/SKILL.md) for the caption mechanics and the
id trap (`LIST_CAPTION_TRACK` takes a video id, `LOAD_CAPTIONS` takes a track
id).

Working from a title and thumbnail produces confident fiction. If a video has
no caption track, say so and work from metadata, labelled as such.

## The transformations

| Task | What good looks like |
|---|---|
| **Summary** | 3-sentence overview, then 4-6 bullet takeaways, all from the transcript |
| **Chapters** | `M:SS Title` per line, first is `0:00`, ascending, 2-5 concrete words |
| **Description** | Substance in the first two lines; under 5,000 characters |
| **Titles** | 5 options under 60 characters, specific, no invented numbers |
| **Tags** | 10-15, lowercase, broad mixed with specific |
| **Repurpose** | Instagram caption + X thread (each post under 280) + Reel script |

YouTube silently ignores a malformed chapter list, so verify the format before
saving one: first marker `0:00`, at least three, strictly ascending, and only
timestamps that appear in the transcript.

## Repurposing across platforms

A transcript is the source for the whole content system. When turning a video
into posts elsewhere, follow that platform's own rules — the Instagram and X
skills carry the limits, and the brand voice applies to all of it.

Ground every claim in the transcript. If the video did not say it, it does not
go in the post.

## Publishing what you draft

Drafting is safe; publishing is not. Confirm before uploading, changing
metadata on a live video, or posting the repurposed content anywhere. Editing
the title or description of a video that is performing can disturb its
placement — say so before rewriting one.

## In the app

`POST /api/yt/studio` with `{task, videoId, prompt}` runs any of these and loads
the transcript automatically; `task` is `summary`, `chapters`, `description`,
`titles`, `tags`, `repurpose` or `comment-reply`. It reports `usedTranscript`,
which is false when it fell back to metadata — pass that on rather than
presenting a metadata-derived draft as transcript-based.

## Publishing what you repurposed

Drafting a video's content into Instagram or X posts is this skill's job.
*Publishing* those drafts in one call — one payload, several platforms, per
platform wording — is Zernio cross-posting; see
[references/zernio.md](../youtube/references/zernio.md).

Two things to get right when the source is a video:

- **The caption that works here does not work there.** Instagram takes 2,200
  chars but shows 125 before the fold and allows no clickable link in the
  caption; X takes 280. Give each platform its own `customContent` rather than
  shipping the YouTube description everywhere.
- **The media has to suit each target.** A 40-minute video cannot go to
  Instagram as a Reel; a Reel cover and a YouTube thumbnail are both URL-only.
  Check before sending, and say which platform would reject what.

A cross-post can succeed on one platform and fail on another. Report the result
**per platform**, and retry only the failed one — retrying the whole payload
double-posts the platform that worked.

**If Zernio is unavailable**, drafting still works exactly as before; only the
one-call publish is gone. Offer to publish to each platform through its own
toolkit and report each result separately.
