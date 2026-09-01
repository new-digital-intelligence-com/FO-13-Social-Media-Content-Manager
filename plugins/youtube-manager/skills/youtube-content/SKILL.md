---
name: youtube-content
description: Work with YouTube video content - load transcripts, write summaries, chapters, descriptions and titles from what the video actually says, and repurpose a video into posts for Instagram or X. Use when the user asks what a video covers, wants chapters or a description written, or wants to turn a video into other content.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../youtube/references/artifact.md](../youtube/references/artifact.md).

> **When you need a decision from the user, ask with the question form.** Use
> the AskUserQuestion tool so they pick from real options with the trade-off
> spelled out on each, rather than reading a paragraph that ends in a question
> mark. Three rules keep it useful: never ask what you can find out yourself —
> read the queue, the settings and the connection state first; make every option
> a genuine choice with its consequence stated, not "yes / no"; and put the one
> you would recommend first, saying why. Anything irreversible — publishing,
> arming an automation, deleting — is confirmed this way, never assumed.

# YouTube content

Everything here starts from the **transcript**. It is the only source that
knows what the video actually says.

## Load captions first

```
YOUTUBE_LIST_CAPTION_TRACK  video_id  -> track list
YOUTUBE_LOAD_CAPTIONS       id        -> the text (a TRACK id, not a video id)
```

Note the id switch: `LIST_CAPTION_TRACK` takes the video id, `LOAD_CAPTIONS`
takes the caption track id from its response. Passing the video id to
`LOAD_CAPTIONS` returns a confusing 404.

**Never summarise, chapter or describe a video without its transcript.** A
title and thumbnail cannot tell you what was said, and guessing produces
confident fiction. If no caption track exists, say so plainly and work from
metadata, labelling it as metadata-derived.

Auto-generated captions are messy — no punctuation, occasional mishearing,
speaker changes unmarked. Read through the noise; do not quote a garbled
phrase as if it were verbatim.

## Chapters

Write from the transcript's timestamps. Format:

```
0:00 Intro
1:24 The actual problem
4:10 Walking through the fix
```

Rules YouTube enforces silently: the first must be `0:00`, there must be at
least three, and they must ascend. A malformed list is ignored entirely with no
error, so verify before saving.

Titles are 2-5 concrete words. Only use timestamps that exist in the
transcript — never interpolate.

## Descriptions and titles

Draft from the transcript, then check against it. The first two lines of a
description show above the fold; put the substance there, not a greeting.

For titles: 5 options, under 60 characters, specific and honest. No clickbait,
no ALL CAPS, no invented numbers. The video has to deliver what the title
promises or retention punishes it.

## Repurposing to other platforms

A transcript is source material for the whole content system:

- **Instagram caption** — hook in the first line; see the Instagram publishing skill for its limits
- **X thread** — 4-6 posts, each under 280 characters, one idea each
- **Reel or Short script** — hook, timestamped beats, on-screen text

Ground every repurposed claim in the transcript. If the video did not say it,
it does not go in the post.

## What you cannot see

Watch time, retention curves, traffic sources and revenue are **YouTube
Analytics API**, which is not in this toolkit. The Data API gives view, like
and comment counts only — and the owner can hide even those. Say "not
available" rather than estimating.
