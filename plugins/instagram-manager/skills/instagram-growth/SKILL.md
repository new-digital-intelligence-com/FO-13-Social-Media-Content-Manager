---
name: instagram-growth
description: Find Instagram accounts to follow by topic, and understand what Instagram allows around following. Use when the user wants account suggestions in a niche, asks who to follow, wants to grow their audience, or asks why following cannot be automated on Instagram.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

# Instagram growth

## Following cannot be automated on Instagram

The Graph API exposes **no follow, unfollow, follower-list or account-lookup
endpoints**. This is a Meta restriction, not a gap in the toolkit and not
something a different connection unlocks.

So:

- You can suggest accounts and link to their profiles.
- You cannot follow them, unfollow them, or read who someone follows.
- You cannot confirm an arbitrary handle exists through Instagram's own API.

Say this plainly when asked. Do not offer to automate following, and do not
imply a suggestion has been verified when it has not.

## Suggesting accounts

The Content Studio app does this at `POST /api/ig/growth` with
`{ topics: [...], count, minFollowers }` — see
[references/app-api.md](../instagram/references/app-api.md).

Two things make suggestions worth anything:

1. **Search before answering.** Recall alone produces accounts that were
   prominent when the model was trained. Handles get renamed, parked and
   overtaken; a dormant account with a few hundred followers looks identical to
   a major one in a list.
2. **A topic is what an account publishes about, never what it is made of.**
   "AI creators" means people who explain AI, not AI-generated virtual
   influencers. This distinction is the single most common failure.

## Follower counts are not free

Instagram will not tell you how large another account is. Any follower number
comes from an external lookup the user has configured; without one, a follower
threshold is a hint to the model, not a filter.

When you cannot enforce a size threshold, **say the list is unranked** rather
than implying it was filtered.

## Reporting honestly

- Never state a follower count you did not receive from a real source.
- If a search turns up nothing that fits, say what you looked for and why it
  came up empty. An empty list with no explanation is a bug, not an answer.
- Suggest fewer good accounts over padding a list to a requested number.
