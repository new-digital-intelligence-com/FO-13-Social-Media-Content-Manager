---
name: instagram
description: Router for Instagram account management through Composio. Use whenever the user wants to work with Instagram - post, publish reels or stories, read or reply to comments, read or send direct messages, check insights, followers, reach or engagement, audit content, manage mentions or ice breakers, or connect an Instagram account.
---

# Instagram

Manage an Instagram Business or Creator account through two providers:
the Composio `INSTAGRAM` toolkit for Instagram API calls, and **Zernio** for
everything needing a server-side clock or engagement history — the publishing
queue, comment-to-DM automations, cross-posting and measured analytics. See
[references/zernio.md](references/zernio.md) for which provider owns what.

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

For the Zernio capabilities, also confirm a `zernio` MCP server is present. The
plugin ships it in the same `.mcp.json`, pointing at
`https://mcp.zernio.com/mcp`; `/mcp` authorizes it by browser sign-in. **Zernio
being absent or unreachable is a normal state, not an error to work around** —
each skill says what degrades to what.

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
| Auto-DM on a comment keyword, story-reply automations, private replies | [instagram-automation](../instagram-automation/SKILL.md) |
| Post the same thing to Instagram and other platforms at once | [instagram-crossposting](../instagram-crossposting/SKILL.md) |

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
- **One question at a time.** Several things missing means several forms in
  sequence, not one numbered list of fields to answer at once.
- **Free text still gets options.** For a keyword, a DM body or a name, draft
  two or three candidates from what you know and offer those; the tool's
  custom-answer path covers the rest. A blank ask hands the user work you
  could have done.
