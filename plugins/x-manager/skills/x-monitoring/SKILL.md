---
name: x-monitoring
description: Search X and track performance - recent and full-archive search, volume counts, monitoring a handle or keyword, and post analytics. Use when the user wants to find posts, watch mentions or a topic, measure reach, or compare how posts performed.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../x/references/artifact.md](../x/references/artifact.md).

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
> **"The options don't fit the tool's format" is not a reason to fall back to
> prose.** Discrete paths always fit. Only when the answer is genuinely
> free-text — a caption, a search term — do you ask in words, and then ask for
> that one thing plainly. If no such tool exists at all, use a **numbered list**,
> one option per line.

# X monitoring

## There is no mentions endpoint

The toolkit exposes no "list my mentions" tool. Monitoring a handle means
**searching for it** with `TWITTER_RECENT_SEARCH` (for example `@yourhandle`).
Say that plainly rather than implying a live mention feed. Anything outside the
search window will not appear.

## Search runs on the app-only bearer token

Every search and counts tool is an **app-only** endpoint. It authenticates with
the app's Bearer Token, not the user's OAuth token, so search fails if the auth
config was created without `generic_id` even though posting works fine. See
[x-setup](../x-setup/SKILL.md).

## Search

| Tool | Required | Window |
|---|---|---|
| `TWITTER_RECENT_SEARCH` | `query` | roughly last 7 days on most plans |
| `TWITTER_FULL_ARCHIVE_SEARCH` | `query` | full history, higher access tier |
| `TWITTER_SEARCH_RECENT_COUNTS` | `query` | volume only, recent |
| `TWITTER_SEARCH_FULL_ARCHIVE_COUNTS` | `query` | volume only, full history |

Use the counts tools when the user wants trend volume rather than post bodies —
they are far cheaper and avoid paging through results.

**"No results" means "none in the window."** For recent search that is about
seven days, not all time. Always say which window you searched.

If full-archive search fails, the plan is usually the reason. Report that
instead of retrying.

## Query syntax

X's operators apply: `from:`, `to:`, `-is:retweet`, `has:media`, `lang:`,
quoted phrases, and `OR`. Exclude retweets when measuring genuine conversation,
otherwise volume is inflated by amplification.

## Analytics

`TWITTER_GET_POST_ANALYTICS` requires `ids`, `start_time` and `end_time` — the
window is not optional. Timestamps are ISO 8601.

`TWITTER_GET_POST_USAGE` reports posts consumed against the plan's monthly cap.
Check it before a bulk posting run.

## Reporting

- Report only returned values; never estimate impressions or reach.
- Give the window with every number.
- Comparisons need equal-length windows.
- Public metrics on a post (`public_metrics`) are a cheaper signal than the
  analytics endpoint and need no extra tier.
