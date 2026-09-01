---
name: instagram-setup
description: Connect an Instagram account to Composio and diagnose Instagram auth problems. Use when the user needs to link or relink Instagram, sees an authorization or permission error, gets empty results from valid calls, or asks whether their account type is supported.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

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
> **If the answer is one of things you can look up, look them up first.** Never
> ask the user to paste an id, a link, or "tell me which one" for something you
> can fetch: list the account's recent posts, its reels, its playlists, its
> automations — whatever the question is about — and offer those as the options,
> each labelled so it is recognisable (the caption's first words and the date,
> not a bare id). Making the user go and find an id you could have fetched is
> the worst version of this failure, because they have to leave the conversation
> to answer you.
>
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For a genuinely open field — a keyword, a DM body, a name — draft
> two or three concrete candidates and offer those; the tool's own custom-answer
> path covers anything else. A blank ask makes the user do work you could have
> done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

# Instagram setup

Get an Instagram Business or Creator account connected through Composio, and fix
it when it breaks.

## Two separate things must be true

1. **This client can reach Composio tools.** In Claude Code that means the
   `composio` MCP server (this plugin ships `.mcp.json` for
   `https://connect.composio.dev/mcp`; check `/mcp`) or the Composio CLI
   (`curl -fsSL https://composio.dev/install | sh`, then `composio login`).
   In an application it means a Composio SDK session.
2. **The Instagram account is authorized** for the acting user, below.

A missing tool is problem 1; an auth error from a tool that ran is problem 2.
Diagnose which before changing anything.

## Connect

Composio returns a hosted Connect Link. **Never build a Meta OAuth flow.**

1. Check state first -- do not re-authorize an account that already works.
   In a session: `session.toolkits({ toolkits: ["instagram"] })`, then read
   `items[0].connection.isActive` (TypeScript) or `.connection.is_active`
   (Python). Inside an agent loop, `COMPOSIO_MANAGE_CONNECTIONS` does this.
2. If not connected, call `session.authorize("INSTAGRAM")`.
3. Give the returned `redirectUrl` to the user and wait. The link expires --
   request a new one rather than reusing a stale link.
4. Confirm with `INSTAGRAM_GET_USER_INFO`; a real `username` and
   `account_type` proves the connection.

## Verify account type before anything else

`INSTAGRAM_GET_USER_INFO` returns `account_type`. Expect `BUSINESS` or
`CREATOR`. Anything else means Instagram's API will reject most calls, and no
amount of reconnecting fixes it.

To convert: Instagram app → Settings → Account type and tools → switch to
Professional, then link the account to a Facebook Page via Meta Business Suite.
This is a change on the user's side; you cannot do it for them.

## Diagnose in this order

Get the Composio `log_id` from the failing response first.

1. **Is the account Business/Creator?** The single most common cause.
2. **Is the connection active?** A token can be revoked by a password change,
   2FA change, consent withdrawal, or a Meta admin policy.
3. **Is it a permission gap rather than a connection failure?** Comment and
   messaging tools need Meta permissions the Composio-managed app may not
   carry -- `instagram_manage_comments` /
   `instagram_business_manage_comments` for comments,
   `instagram_manage_messages` for DMs. These must be configured on a Meta app
   and approved by Meta. The unblock for production is your own Meta OAuth app.
4. **Is it the project credential, not the account?** A 401 that arrives before
   any Instagram call is a Composio project key problem, not an Instagram one.
   Do not reconnect Instagram to fix it, and do not rotate the key blindly.

## Managed auth vs your own Meta app

Start on Composio's managed app -- it is the fastest path and needs no Meta
review. Move to your own Meta OAuth app when you need: your branding on the
consent screen, comment or messaging permissions the managed app lacks,
dedicated rate limits, or production-grade review.
