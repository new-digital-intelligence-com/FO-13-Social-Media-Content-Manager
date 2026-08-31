---
name: youtube-setup
description: Connect a YouTube channel to Composio and diagnose YouTube auth or quota problems. Use when the user needs to link YouTube, sees quotaExceeded, a 403, or asks why a YouTube call failed.
---

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
