---
argument-hint: [what to do — e.g. "summarise my latest video", "schedule an upload", "retention"]
description: Manage the YouTube channel — uploads, scheduling, transcripts, comments, playlists, retention and analytics. Opens the Content Studio in the Claude app.
---

Load the `youtube` router skill and act on what follows.

$ARGUMENTS

If no request was given, do not ask an open question. Read the current state —
connector status, the channel, and the upload queue — and present it, so the
first screen is useful on its own.

Quota is the real constraint: reads are cheap, an upload is ~1600 units of a
default 10,000/day. Never upload to "check" something.

In the Claude app, render into the **Content Studio** artifact rather than
prose: find the existing one and update it, never publish a second. In a
terminal, answer in text.
