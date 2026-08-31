---
name: instagram
description: Router for Instagram account management through Composio. Use whenever the user wants to work with Instagram - post, publish reels or stories, read or reply to comments, read or send direct messages, check insights, followers, reach or engagement, audit content, manage mentions or ice breakers, or connect an Instagram account.
---

# Instagram

Manage an Instagram Business or Creator account through the Composio
`INSTAGRAM` toolkit.

## 1. Read the operating rules

**[references/rules.md](references/rules.md) is the behaviour contract** —
account facts, tool discipline, when to confirm, how to report, media and
permission constraints. Read it before acting. The companion web app injects
the same file into its agent prompt, so both surfaces behave identically.

## 2. Check that tools are actually available

A skill is instructions only; it carries no tool access. Executing anything
here requires a Composio connection in this client.

Confirm you can see Composio tools (`COMPOSIO_SEARCH_TOOLS` and friends, or a
`composio` MCP server). If none are present:

- This plugin ships `.mcp.json` pointing at `https://connect.composio.dev/mcp`.
  Enabling the plugin registers it; `/mcp` lists its status and authorizes it.
- Or use the Composio CLI, which is Composio's recommended path for Claude Code:
  `curl -fsSL https://composio.dev/install | sh` then `composio login`, and
  operate with `composio search`, `composio link instagram`, `composio execute`.

Then confirm the Instagram account itself is connected — see
[instagram-setup](../instagram-setup/SKILL.md). Tool access and account
authorization are separate steps; having one does not imply the other.

## 3. Route to the job

| The user wants to | Load |
|---|---|
| Connect an account, fix auth, check account type | [instagram-setup](../instagram-setup/SKILL.md) |
| Post, publish, reels, stories, carousels, tagging | [instagram-publishing](../instagram-publishing/SKILL.md) |
| Reach, views, followers, engagement, demographics, reporting | [instagram-insights](../instagram-insights/SKILL.md) |
| Read, reply to, or moderate comments and mentions | [instagram-engagement](../instagram-engagement/SKILL.md) |
| Read or send DMs, manage the inbox, ice breakers | [instagram-messaging](../instagram-messaging/SKILL.md) |
| Browse, search or audit existing posts and stories | [instagram-content](../instagram-content/SKILL.md) |
| Schedule a post, manage the queue, check posting cadence | [instagram-scheduling](../instagram-scheduling/SKILL.md) |
| Triage comments, decide what needs a reply, get content ideas | [instagram-monitoring](../instagram-monitoring/SKILL.md) |
| Find accounts to follow by topic | [instagram-growth](../instagram-growth/SKILL.md) |

For a request spanning several (for example "review last month and draft next
week's posts"), load them in sequence rather than guessing across all of them.

The full verified tool inventory is [references/tools.md](references/tools.md).

Capabilities built on the app's own state — the queue, brand voice, account
selection, media hosting — are reachable over HTTP; see
[references/app-api.md](references/app-api.md). Everything else is the same
tools on both surfaces.

## 4. When a call fails

Get the Composio `log_id` first, then work through the failure modes in
[references/rules.md](references/rules.md) — account type, connection state,
Meta permission gap, or a Composio project credential problem. These have
different fixes; do not reconnect the account to solve a project-key 401.
