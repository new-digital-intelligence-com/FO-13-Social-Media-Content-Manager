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
