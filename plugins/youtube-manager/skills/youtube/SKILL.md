---
name: youtube
description: Router for YouTube channel management through Composio. Use whenever the user wants to work with YouTube - upload or edit videos, write titles, descriptions, tags or chapters, manage playlists, read or moderate comments, pull a video transcript, check channel statistics, search YouTube, or repurpose a video into posts for other platforms.
---

# YouTube

Manage a YouTube channel through two providers: the Composio `YOUTUBE` toolkit
(51 tools) for Data API calls, and **Zernio** for scheduled uploads and the deep
analytics the Data API does not expose — retention, demographics, daily views.
See [references/zernio.md](references/zernio.md) for which provider owns what.

## 1. Read the operating rules

**[references/rules.md](references/rules.md) is the behaviour contract** —
quota, id types, when to confirm, moderation limits, what the API does and does
not expose. Read it before acting. The companion web app injects the same file
into its agent prompt, so both surfaces behave identically.

## 2. Check tools, then the connection

A skill carries no tool access. Confirm Composio tools are visible; if not,
this plugin ships `.mcp.json` for `https://connect.composio.dev/mcp` (`/mcp`
shows status), or use the Composio CLI (`composio login`).

For scheduling and deep analytics, also confirm a `zernio` MCP server is
present. The plugin ships it in the same `.mcp.json`, pointing at
`https://mcp.zernio.com/mcp`; `/mcp` authorizes it by browser sign-in. **Zernio
being absent or unreachable is a normal state, not an error to work around** —
each skill says what degrades to what.

YouTube **has a managed app**, so connecting is one step — no developer
credentials needed, unlike X. See [youtube-setup](../youtube-setup/SKILL.md).

## 3. Load the transcript first

For anything about what a video *says* — summary, chapters, description, tags,
repurposing, answering a question about the content — start with
`YOUTUBE_LIST_CAPTION_TRACK` then `YOUTUBE_LOAD_CAPTIONS`. Working from the
title alone produces confident fiction.

## 4. Route to the job

| The user wants to | Load |
|---|---|
| Connect the channel, fix auth, understand quota | [youtube-setup](../youtube-setup/SKILL.md) |
| Upload, edit metadata, thumbnails, publish | [youtube-publishing](../youtube-publishing/SKILL.md) |
| Transcripts, chapters, descriptions, repurposing | [youtube-content](../youtube-content/SKILL.md) |
| Turn a video into summaries, titles, tags or cross-platform posts | [youtube-studio](../youtube-studio/SKILL.md) |
| Read, reply to or moderate comments | [youtube-comments](../youtube-comments/SKILL.md) |
| Playlists, subscriptions, search, discovery | [youtube-growth](../youtube-growth/SKILL.md) |
| Schedule an upload, manage the queue, drip-feed a batch | [youtube-scheduling](../youtube-scheduling/SKILL.md) |
| Retention, demographics, daily views, best time to post | [youtube-analytics](../youtube-analytics/SKILL.md) |

The full verified tool inventory is [references/tools.md](references/tools.md).

The same capabilities are available in the Content Studio app; only the
connection differs. See [references/app-api.md](references/app-api.md) for the
few features built on the app's own state.

## 5. Show the result, don't just describe it

In the **Claude app** or on claude.ai, publish an **Artifact** instead of a wall
of text whenever the answer is a queue, a report, a set of drafts, or anything
with more than a couple of rows. Use the Content Studio's own visual language so
both surfaces read as one product, and lead with a **connector status strip** —
Composio and Zernio, what each powers, and whether it is connected — because not
knowing which provider is missing is the commonest confusion.

See [references/artifact.md](references/artifact.md) for the tokens, the
components, and which shape to build for which request.

Default to a **snapshot**: fetch with your connectors, bake the data in, make
the page interactive (tabs, filters, counters, editable drafts) but let actions
come back through you. Only give a page live connector access when you have
already observed a real request and response for every tool it calls, in this
session — the type contract carries the call envelope, never a tool's argument
names or result shape.

In a terminal there is no artifact viewer: answer in text.
