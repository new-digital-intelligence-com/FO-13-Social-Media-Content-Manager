---
name: instagram-insights
description: Read Instagram analytics - reach, views, followers, engagement, saves, shares, profile taps, and audience demographics, for the account or an individual post. Use when the user asks how content performed, wants a report, compares posts, or asks about growth, audience or best posting time.
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

# Instagram insights

Two levels: the account (`INSTAGRAM_GET_USER_INSIGHTS`) and a single post
(`INSTAGRAM_GET_IG_MEDIA_INSIGHTS`). The parameter rules differ and are the main
source of errors.

## Account insights

`INSTAGRAM_GET_USER_INSIGHTS` -- all parameters optional; `ig_user_id` defaults
to the authenticated account (numeric ID only, never a username).

**Metrics:** `reach`, `follower_count`, `online_followers`, `accounts_engaged`,
`total_interactions`, `likes`, `comments`, `shares`, `saves`, `replies`,
`follows_and_unfollows`, `profile_links_taps`, `views`, `profile_views`,
`website_clicks`, and the demographics metrics below.

**The rules that actually break calls:**

- `period` is `day` or `lifetime` **only**. `week` and `days_28` are gone.
- `metric_type` is `time_series` (a value per day) or `total_value` (one
  aggregate). Pick deliberately -- a trend chart needs `time_series`.
- `breakdown` requires `metric_type: total_value`. Allowed:
  `contact_button_type`, `follow_type`, `media_product_type`, `age`, `city`,
  `country`, `gender`.
- `timeframe` (`this_week` or `this_month`) is **required** for the demographics
  metrics: `engaged_audience_demographics`, `reached_audience_demographics`,
  `follower_demographics`, `threads_follower_demographics`.
- `since`/`until` are Unix seconds, and also accept `YYYY-MM-DD`.

Do not mix a demographics metric and a time-series metric in one call; run them
separately.

## Post insights

`INSTAGRAM_GET_IG_MEDIA_INSIGHTS` -- requires `ig_media_id` and `metric` as an
**array**.

Common metrics: `views`, `reach`, `saved`, `likes`, `comments`, `shares`,
`total_interactions`, `reposts`. Reels and Stories expose extra metrics; Story
navigation needs `breakdown: "story_navigation_action_type"`.

Period is always lifetime -- do not pass a period.

To report on recent posts: `INSTAGRAM_GET_IG_USER_MEDIA` for the IDs, then
media insights per post. Watch the call volume on a large back catalogue and
tell the user if you are sampling rather than covering everything.

## Reporting well

- **A new or empty account returns zeros.** Say the account has no data yet
  rather than presenting an empty report as a finding.
- **Never estimate.** If a metric is not in the response, say it is unavailable.
  Some metrics are null for accounts under Meta's reporting thresholds.
- Give the date range with every number; a bare "reach: 402" is unreadable.
- Comparisons need equal-length windows.
- Reach counts unique accounts; views counts impressions. Do not use them
  interchangeably.
- "Best time to post" comes from `online_followers`, not from guesswork.

## Measured timing and decay (Zernio)

Composio answers "how did this post do". It cannot answer "when should I post"
or "how fast does my reach fall off" — those need history across posts, and live
on Zernio. See [references/zernio.md](../instagram/references/zernio.md).

- **Best time to post** — engagement grouped by day of week and hour.
  **Hours are UTC** and `day_of_week` is 0=Monday; convert before saying "post
  at 7pm". Check `post_count` per slot first: a slot backed by two posts is
  noise, not a recommendation.
- **Content decay** — how a post's performance falls off after publishing.
- **Posting frequency vs engagement** — whether posting more actually helps this
  account, rather than assuming it does.
- **Follower history and demographics** — the trend over time, not just today's
  count.

Analytics routes are rate limited per **second** (6/s on the free tier). Sequence
the calls for a report rather than fanning out.

**If Zernio is unavailable**, per-post and account insights still work through
Composio — offer those. Best-time, decay and frequency have no Composio
equivalent: report them unavailable. Never guess an optimal posting hour; a
plausible-sounding time the user acts on is worse than saying you do not know.
