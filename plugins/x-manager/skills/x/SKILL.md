---
name: x
description: Router for X (Twitter) account management through Composio. Use whenever the user wants to work with X or Twitter - post or delete tweets and threads, reply, quote, like, repost, bookmark, hide replies, follow or mute accounts, search posts, monitor a handle or keyword, manage lists, read or send DMs, or check post analytics.
---

# X (Twitter)

Manage an X account through the Composio `TWITTER` toolkit (79 tools).

## 1. Read the operating rules

**[references/rules.md](references/rules.md) is the behaviour contract** —
plan tiers, rate limits, the 280-character ceiling, when to confirm, how to
report. Read it before acting. The companion web app injects the same file into
its agent prompt, so both surfaces behave identically.

## 2. Check that tools are available, then that setup is done

A skill carries no tool access. Confirm you can see Composio tools; if not, this
plugin ships `.mcp.json` for `https://connect.composio.dev/mcp` (`/mcp` shows
status), or use the Composio CLI (`composio login`).

Then check X specifically. **Unlike most toolkits, X has no Composio-managed
app** — see [x-setup](../x-setup/SKILL.md). Until the user's own credentials are
configured, every call fails at session creation with code 4300.

## 3. Route to the job

| The user wants to | Load |
|---|---|
| Connect X, fix auth, understand plan limits | [x-setup](../x-setup/SKILL.md) |
| Post, thread, reply, quote, delete, attach media or a poll | [x-posting](../x-posting/SKILL.md) |
| Like, repost, bookmark, hide replies, follow, mute | [x-engagement](../x-engagement/SKILL.md) |
| Search posts, track a handle or keyword, read analytics | [x-monitoring](../x-monitoring/SKILL.md) |
| Create or curate lists | [x-lists](../x-lists/SKILL.md) |
| Read or send direct messages | [x-messaging](../x-messaging/SKILL.md) |
| Find accounts to follow by topic, or prune who they follow | [x-growth](../x-growth/SKILL.md) |

The full verified tool inventory is [references/tools.md](references/tools.md).

The same capabilities are available in the Content Studio app; only the
connection differs. See [references/app-api.md](references/app-api.md) for the
few features built on the app's own state.

## 4. Get the account id once

Most write endpoints need the numeric user id rather than the handle. Call
`TWITTER_USER_LOOKUP_ME` once and reuse the id across the task.

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
