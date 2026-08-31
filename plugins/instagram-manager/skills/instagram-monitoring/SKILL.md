---
name: instagram-monitoring
description: Watch Instagram engagement and decide what needs a human - triage comments for questions, complaints and escalation keywords, and propose content ideas grounded in what actually performed. Use when the user asks what needs a reply, wants their comments triaged, asks how their content is doing, or wants ideas for what to post next.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

# Instagram monitoring

## There is no mentions feed

Instagram exposes no API to list @mentions. Monitoring means sweeping comments
on recent posts. Say that rather than implying a live mention stream — mentions
in other people's posts only reach the user through Instagram's own
notifications.

## Triage

Read recent posts with `INSTAGRAM_GET_IG_USER_MEDIA`, then
`INSTAGRAM_GET_IG_MEDIA_COMMENTS` per post. Sort what you find into:

- **Needs attention** — anything matching the user's escalation keywords
  (refunds, complaints, legal). These come first regardless of tone.
- **Negative** — dissatisfaction that is not an escalation.
- **Question** — someone asking something answerable.

Everything else is not worth surfacing. A triage list that includes praise
buries the things that actually need a person.

Escalation keywords are a user setting, not a fixed list — read them rather
than assuming which words matter to this account.

## Drafting replies

Match the account's voice; read recent replies before writing several. Never
invent facts about prices, stock, shipping or availability — flag those for the
user instead of guessing.

Present a batch as one list for a single approval, then report failures
individually. Every reply is public and immediate.

## Content ideas from real performance

Ground suggestions in this account's own data: pull recent posts, rank by
engagement, and build on what worked. Say which post or pattern each idea comes
from.

With no posting history there is nothing to ground in — say so in a line and
base ideas on the account's stated topics instead. Do not present generic
advice as analysis, and never invent a metric to justify an idea.

## Reporting

State coverage: "across the 25 most recent posts" is honest; presenting one
page as the whole library is not. Give only what the API returned.
