---
name: youtube
description: Router for YouTube channel management through Composio. Use whenever the user wants to work with YouTube - upload or edit videos, write titles, descriptions, tags or chapters, manage playlists, read or moderate comments, pull a video transcript, check channel statistics, search YouTube, or repurpose a video into posts for other platforms.
---

# YouTube

Manage a YouTube channel through the Composio `YOUTUBE` toolkit (51 tools).

## 1. Read the operating rules

**[references/rules.md](references/rules.md) is the behaviour contract** —
quota, id types, when to confirm, moderation limits, what the API does and does
not expose. Read it before acting. The companion web app injects the same file
into its agent prompt, so both surfaces behave identically.

## 2. Check tools, then the connection

A skill carries no tool access. Confirm Composio tools are visible; if not,
this plugin ships `.mcp.json` for `https://connect.composio.dev/mcp` (`/mcp`
shows status), or use the Composio CLI (`composio login`).

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

The full verified tool inventory is [references/tools.md](references/tools.md).

The same capabilities are available in the Content Studio app; only the
connection differs. See [references/app-api.md](references/app-api.md) for the
few features built on the app's own state.
