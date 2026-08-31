---
argument-hint: [what to do — e.g. "draft a thread", "search my mentions", "show my lists"]
description: Manage the X (Twitter) account — post and threads, timeline, search, lists, DMs, engagement. Opens the Content Studio in the Claude app.
---

Load the `x` router skill and act on what follows.

$ARGUMENTS

If no request was given, do not ask an open question. Read the current state —
connector status and the account — and present it, so the first screen is
useful on its own.

X is not connected on Zernio, so there is no queue for it: say scheduling is
unavailable for X rather than rendering an empty queue.

In the Claude app, render into the **Content Studio** artifact rather than
prose: find the existing one and update it, never publish a second. In a
terminal, answer in text.
