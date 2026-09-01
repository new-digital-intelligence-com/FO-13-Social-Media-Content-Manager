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

## 5. Work through the Content Studio artifact

In the **Claude app** or on claude.ai there is **one** artifact for this whole
toolkit — a single **Content Studio** page covering Instagram, X and YouTube —
and these skills are its backend. Do not publish an artifact per question:
find the existing studio, refresh the part the user asked about, and republish
it to the same URL.

**Build or update it for every substantive answer**, not only long ones. An
empty queue, a failed fetch and a missing connector are all states the studio
draws — "nothing scheduled", "not loaded yet", "could not be read" — so a thin
result is a reason to render it, never a reason to fall back to prose. Reply in
text only for a single fact ("yes, Instagram is connected") or in a terminal.

Start from [references/content-studio.html](references/content-studio.html);
the rules and the `DATA` contract are in
[references/artifact.md](references/artifact.md).

You fetch with your connectors, then fill `DATA` and republish. Leave a key
**out** when you did not fetch it and the section says "not loaded"; set it to
`[]` when you fetched nothing and it says "nothing here" — those must never look
alike. The page never calls a platform itself: its action is "Copy for Claude".

Lead with the connector strip — Composio and Zernio, what each powers, whether
it is connected — because not knowing which provider is missing is the
commonest confusion.

In a terminal there is no artifact viewer: answer in text.

## 6. Ask with the question form, not prose

The moment you would write a sentence ending in "?" that contains options, stop
and ask with the **tappable question tool** instead. The user clicks; they do
not read a paragraph and retype one of its clauses.

Its name differs by surface: **`ask_user_input_v0`** in the Claude app,
**`AskUserQuestion`** in Claude Code. Use whichever is in your toolset. Not
finding one exact name is not a reason to fall back to prose — check for the
other, and failing both, use a numbered list.

This binds on the first turn too: invoked with no request, never open with
"what would you like to do?". Read the state — connectors, what exists, what is
live — show it, then put the next step in the question form.

- **Never ask what you can determine.** Read the queue, the settings, the
  connection state first. A question you could have answered yourself is friction.
- **Every option states its consequence.** "Publish now — visible immediately,
  no undo" beats "yes". Never offer a bare yes/no.
- **Recommend one, and put it first**, with the reason.
- **Anything irreversible is confirmed this way** — publishing, arming an
  automation, deleting a queued post — never assumed from context.
