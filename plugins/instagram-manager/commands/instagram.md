---
argument-hint: [what to do — e.g. "what is queued", "draft a caption", "who needs a reply"]
description: Manage the Instagram account — queue, drafts, insights, comments, DMs, automations. Opens the Content Studio in the Claude app.
---

Load the `instagram` router skill and act on what follows.

$ARGUMENTS

If no request was given, do not ask an open question. Read the current state —
connector status, the queue, and whether queue slots exist — and present it, so
the first screen is useful on its own.

In the Claude app, render into the **Content Studio** artifact rather than
prose: find the existing one and update it, never publish a second. In a
terminal, answer in text.
