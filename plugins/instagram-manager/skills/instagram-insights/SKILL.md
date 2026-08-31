---
name: instagram-insights
description: Read Instagram analytics - reach, views, followers, engagement, saves, shares, profile taps, and audience demographics, for the account or an individual post. Use when the user asks how content performed, wants a report, compares posts, or asks about growth, audience or best posting time.
---

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
