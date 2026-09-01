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
> **"The options don't fit the tool's format" is not a reason to fall back to
> prose.** Discrete paths always fit. Only when the answer is genuinely
> free-text — a caption, a search term — do you ask in words, and then ask for
> that one thing plainly. If no such tool exists at all, use a **numbered list**,
> one option per line.

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
