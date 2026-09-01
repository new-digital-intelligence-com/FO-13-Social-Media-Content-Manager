---
name: x-lists
description: Create and curate X lists - create, update, delete, add or remove members, follow, pin, and read a list's timeline. Use when the user wants to organise accounts into lists or read from one.
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

# X lists

Lists are the cheapest way to follow a topic without following accounts.

## Confirm before changing

Adding or removing members and deleting a list are visible to the people
involved (a member sees they were added to a public list). Deleting is
permanent. Confirm first.

## Managing

| Intent | Tool | Required |
|---|---|---|
| Create | `TWITTER_CREATE_LIST` | `name` |
| Update | `TWITTER_UPDATE_LIST` | `id` |
| Delete | `TWITTER_DELETE_LIST` | `id` |
| Add member | `TWITTER_ADD_LIST_MEMBER` | `id`, `user_id` |
| Remove member | `TWITTER_REMOVE_LIST_MEMBER` | `id`, `user_id` |
| Follow / unfollow | `TWITTER_FOLLOW_LIST` / `TWITTER_UNFOLLOW_LIST` | `id`, `list_id` |
| Pin / unpin | `TWITTER_PIN_LIST` / `TWITTER_UNPIN_LIST` | `id`, `list_id` / `list_id` |

Create takes `private` to keep a list hidden — use it when curating
competitors or research, since a public list announces who you are watching.

## Reading

`TWITTER_GET_LIST` (`id`), `TWITTER_GET_LIST_MEMBERS` (`id`),
`TWITTER_GET_LIST_FOLLOWERS` (`id`), and
`TWITTER_LIST_POSTS_TIMELINE_BY_LIST_ID` (`id`) for the list's posts.

For a user's own lists: `TWITTER_GET_USER_OWNED_LISTS`,
`TWITTER_GET_USER_FOLLOWED_LISTS`, `TWITTER_GET_USER_PINNED_LISTS` and
`TWITTER_GET_USER_LIST_MEMBERSHIPS` — all keyed by the user `id`.

Members are added by **numeric user id**, so resolve handles first with
`TWITTER_USER_LOOKUP_BY_USERNAME`.
