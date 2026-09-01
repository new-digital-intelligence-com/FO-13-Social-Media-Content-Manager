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
