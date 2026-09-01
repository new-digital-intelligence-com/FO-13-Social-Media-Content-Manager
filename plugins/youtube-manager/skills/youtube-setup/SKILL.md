---
name: youtube-setup
description: Connect a YouTube channel to Composio and diagnose YouTube auth or quota problems. Use when the user needs to link YouTube, sees quotaExceeded, a 403, or asks why a YouTube call failed.
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
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For an open field — a keyword, a DM body, a name — draft two or
> three concrete candidates from what you already know and offer those as the
> options; the tool's own custom-answer path covers anything else. A blank ask
> makes the user do work you could have done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

# YouTube setup

YouTube **has a Composio-managed app**, so connecting is one step — no Google
Cloud project, no credentials. This is the easy one.

## Connect

1. Check state first; do not re-authorize a working channel.
2. `session.authorize("YOUTUBE")` returns a hosted Connect Link.
3. Give the user the link and wait. Links expire — request a fresh one rather
   than reusing a stale link.
4. Confirm with `YOUTUBE_LIST_CHANNELS` (`mine: true`). A real channel title
   proves the connection.

The account must actually own a channel. A Google account with no channel
authorizes successfully and then returns empty lists.

## Quota is the thing that will bite

YouTube meters by **units per day**, not requests. Defaults are 10,000/day:

| Operation | Approx. cost |
|---|---|
| Read (list/get) | 1-3 units |
| Search | 100 units |
| Upload a video | ~1600 units |
| Write (update, playlist edit) | ~50 units |

So roughly six uploads, or a hundred searches, exhausts a default quota.
Search is the quiet budget killer — prefer listing the channel's own videos
over searching when both would answer the question.

The managed OAuth app **shares provider quota across users**, so exhaustion
can arrive with no heavy use on this account. The fix for production is the
user's own Google Cloud OAuth app in the YouTube auth config, which gives the
project its own quota and the ability to request an increase.

Quota resets daily on Pacific time.

## Diagnosing

Get the Composio `log_id` first, then:

- **`quotaExceeded` / `dailyLimitExceeded`** — out of units. Wait for reset or
  move to a dedicated OAuth app. Never retry in a loop; retries burn nothing
  but time and make the log harder to read.
- **403 on a specific resource** — the connected account does not own that
  video, playlist or channel, or the granted scopes do not cover the action.
- **404** — check the id, and check the *kind* of id: video, channel, playlist
  and playlist-item ids are not interchangeable.
- **Empty lists on a valid connection** — the Google account may have no
  channel, or the channel may hide its statistics.
- **Auth error after previously working** — token revoked or expired.
  Reconnect the channel.
