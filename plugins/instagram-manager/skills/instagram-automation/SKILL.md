---
name: instagram-automation
description: Set up and manage Instagram comment-to-DM and story-reply automations, and send private replies to commenters. Use when the user wants a keyword in comments to trigger an automatic DM, wants to answer story replies automatically, wants to DM someone who commented, or asks to review how an existing automation is performing.
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

# Instagram automation

Keyword-triggered DMs, story-reply answers, and private replies to commenters.
**All of this is Zernio-only** — no Instagram tool in the Composio toolkit does
any of it. Read [references/zernio.md](../instagram/references/zernio.md) for
the connector contract and the failure ladder.

If Zernio is unreachable, this skill has **no fallback**. Say the capability is
unavailable, and offer the manual equivalent: triage comments with
`instagram-monitoring` and reply by hand with `instagram-engagement`.

## What an automation is

Someone comments a keyword on a post; they get a DM. That is the whole shape.
Two triggers:

- **`comment`** (default) — fires on keyword comments on a post or reel.
- **`story_reply`** — fires when someone replies to a story with a keyword. Set
  `platformPostId` to a story media id to scope it to one story, or omit it to
  match replies to any story.

## Targeting

- **Per-post**: set `platformPostId`. Only one active per-post automation per
  post. Per-post automations take priority on their post.
- **Account-wide**: omit `platformPostId` and `postId`. It evaluates every
  comment on every post. Unlimited account-wide automations can stack, each with
  its own keyword set, running independently.

Set `alsoMatchInDms: true` on a `comment` automation to also answer people who
send the keyword as a DM instead. Each door deduplicates separately — someone
who got the DM from commenting still gets it if they later DM the keyword.
Requires at least one keyword.

## Audience gating, and the part that surprises people

`audience` (Instagram only) restricts to followers or non-followers, and/or a
minimum follower count.

**Instagram only reveals the follow relationship for people who have already
messaged the account.** For everyone else the relationship is unknown, and
`audience.whenUnknown` decides what happens. `verify` sends a one-tap
confirmation DM (`followGate`) and then delivers the real DM automatically;
people already known to follow skip the tap.

Explain this before setting a follower-gated automation. A user who expects
silent filtering will be surprised by an extra tap appearing for most people.

## Private replies

A private reply DMs someone directly from their comment. Instagram supports it;
the Composio toolkit does not expose it, so it lives here.

It is a message to a real person, sent from the account. Confirm the recipient
and the exact text before sending, same as any DM.

## Before switching one on

An automation sends real messages to real people, unattended, potentially for
months. Treat enabling one as more consequential than sending a single DM:

- Show the **exact** keyword set, the **exact** DM text, and the targeting
  (which post, or account-wide) and get explicit agreement.
- Say plainly that it keeps running until disabled.
- A broad keyword on an account-wide automation will DM people who used the word
  incidentally. Flag that risk before creating one.
- Never enable, edit, or delete an automation the user did not ask you to touch.

## Reviewing performance

Automations return stats: delivered, read, and link clicks. Link buttons are
click-tracked by default (`linkTracking`), and clickers can be tagged
(`clickTag`) for segmentation. Automation logs list individual firings.

Report the numbers as returned. If the stats endpoint is unavailable, say so
rather than inferring engagement from anything else.
