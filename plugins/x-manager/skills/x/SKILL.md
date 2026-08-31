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
