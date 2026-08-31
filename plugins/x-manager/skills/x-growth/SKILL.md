---
name: x-growth
description: Find X accounts to follow by topic and follow or unfollow them in bulk with review. Use when the user wants account suggestions in a niche, asks who to follow on X, wants to grow their audience, or wants to prune who they follow.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../x/references/artifact.md](../x/references/artifact.md).

# X growth

Unlike Instagram, X **does** expose following: `TWITTER_FOLLOW_USER` and
`TWITTER_UNFOLLOW_USER` (both take `target_user_id`), and
`TWITTER_FOLLOWING_BY_USER_ID` to read the current list.

That makes bulk following possible, which is exactly why it needs care.

## The order that makes suggestions trustworthy

1. **Search** for who is currently prominent in the topic. Recall alone returns
   accounts that were big when the model was trained.
2. **Verify** every handle with `TWITTER_USER_LOOKUP_BY_USERNAMES` (up to 100
   per call). Anything that does not resolve did not exist — drop it silently
   rather than showing the user a dead handle.
3. **Filter** on the follower counts the lookup returned, never on the model's
   impression of who is famous.
4. **Mark** accounts already followed rather than hiding them, so the list
   reflects the whole topic.
5. **Let the user choose**, then act only on what they picked.

A topic describes what an account *publishes about*, not what it is made of.

## Confirm, and keep batches small

Following is public and attributed. Mass-following and follow-churn get
accounts limited by X, so:

- Never follow a list the user has not seen.
- Keep a batch to roughly 25 and space batches out.
- Report per-account results; one failure must not abort the rest.
- If asked for hundreds at once, say why that is a bad idea before doing it.

The same applies in reverse: bulk unfollowing reads as churn just as clearly.

## Unfollowing

`TWITTER_FOLLOWING_BY_USER_ID` lists who the user follows; unfollow takes
`target_user_id`. When asked to "clean up who I follow", list candidates with a
reason (inactive, off-topic, never engages) and let the user pick. Never infer
that a quiet account should be dropped.

## In the app

`POST /api/x/growth` with `{action, topics, count, minFollowers, userIds}` runs
this whole flow — see
[the app API reference](../x/references/app-api.md). `action` is
`suggest`, `follow`, `unfollow` or `following`.
