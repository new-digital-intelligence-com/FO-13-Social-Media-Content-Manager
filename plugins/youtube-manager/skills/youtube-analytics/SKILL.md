---
name: youtube-analytics
description: Read YouTube channel and video analytics - audience retention curves, demographics, daily views, follower history, best times to post, and how performance decays after publishing. Use when the user asks how a video performed, where viewers drop off, who is watching, when to post, or wants a channel performance report.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../youtube/references/artifact.md](../youtube/references/artifact.md).

# YouTube analytics

Two sources, and the split matters:

- **Composio** returns Data API statistics — view count, like count, comment
  count on a video or channel. Cheap, immediate, shallow.
- **Zernio** returns real analytics — retention curves, demographics, daily
  views, best-time, decay. These need `yt-analytics.readonly` and have no Data
  API equivalent.

Contract and failure ladder:
[references/zernio.md](../youtube/references/zernio.md).

**Never present a Data API statistic as if it were the analytics metric asked
for.** "Views" from the Data API is not a retention curve. If the deep metric is
unavailable, say the metric is unavailable.

## Retention — where viewers leave

```
GET /v1/analytics/youtube/video-retention?videoId=<id>&accountId=<accountId>
```

Up to 100 points at `elapsedVideoTimeRatio` 0.01–1.0, aggregated over the whole
range. YouTube does not do per-day retention.

Reading it correctly:

- `audienceWatchRatio` is the absolute share watching at that point and **can
  exceed 1** — rewinds and looping, very common on Shorts. A value above 1 is
  not an error and not a bug to explain away.
- `relativeRetentionPerformance` compares against videos of similar length:
  0 worst, 0.5 median, 1 best. This is the honest "is this good" number;
  `audienceWatchRatio` alone is not comparable across videos.
- An empty curve means too few views, or analytics have not processed yet.
  Say that. Do not read a flat line as "everyone watched".

## The processing delay is real

YouTube finalizes analytics with a **~3 day lag**. `endDate` defaults to 3 days
ago for that reason. Days inside the window are provisional and YouTube may
revise them — the response marks this with `provisionalSince`.

When reporting recent numbers, say which days are provisional. A user making a
decision on yesterday's data should know it will move.

## Other reads

- **Channel insights** — aggregate channel performance.
- **Daily views** — the time series, for spotting a spike and dating it.
- **Demographics** — who is watching. Small channels return sparse or empty
  demographics; report the gap rather than generalizing from a handful of rows.
- **Best time to post** — `GET /v1/analytics/best-time`, engagement grouped by
  day of week and hour. **Hours are UTC**; `day_of_week` is 0=Monday. Convert to
  the user's timezone before saying "post at 7pm", and check `post_count` per
  slot — a slot with two posts behind it is noise, not a recommendation.
- **Content decay** — how performance falls off after publishing.
- **Posting frequency vs engagement** — whether posting more is actually helping.

## Reporting rules

- Give the number and the window it covers. A view count with no date range is
  not a fact.
- A channel with almost no history produces almost no signal. Say "not enough
  data yet" instead of ranking three videos as if it meant something.
- Never estimate, extrapolate, or fill a gap with a plausible figure. A missing
  metric is reported missing.
- Analytics endpoints are rate limited per **second** (6/s on the free tier), so
  do not fan out a dozen calls at once for a report; sequence them.

## When Zernio is unavailable

Composio still gives view, like and comment counts per video, and channel
statistics — offer those, labelled for what they are. Retention, demographics,
daily views, best-time and decay are simply unavailable; say so plainly rather
than substituting a shallower number.

A 403 on an analytics route means the Analytics add-on is missing or
`yt-analytics.readonly` was never granted — the fix is re-authorization, not a
retry.
