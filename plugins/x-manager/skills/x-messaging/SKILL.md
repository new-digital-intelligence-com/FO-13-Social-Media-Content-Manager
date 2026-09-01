---
name: x-messaging
description: Read and send X direct messages, including group conversations. Use when the user wants to check DMs, reply to someone, start a conversation, or delete a message on X.
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
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For an open field — a keyword, a DM body, a name — draft two or
> three concrete candidates from what you already know and offer those as the
> options; the tool's own custom-answer path covers anything else. A blank ask
> makes the user do work you could have done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

# X messaging

DMs are private and sent as the account. A wrong DM cannot be recalled.

## Confirm before sending

Show the recipient and the exact text, then get agreement. Never send to a list
of people from one blanket approval. **Unsolicited bulk DMs violate X's rules**
and get accounts limited — if asked for mass outreach, say so rather than doing
it.

## Reading

| Intent | Tool | Required |
|---|---|---|
| Recent activity across the inbox | `TWITTER_GET_RECENT_DM_EVENTS` | — |
| One person's conversation | `TWITTER_GET_DM_CONVERSATION_EVENTS` | `participant_id` |
| A known conversation | `TWITTER_RETRIEVE_DM_CONVERSATION_EVENTS` | `id` |
| A single event | `TWITTER_GET_DM_EVENT` | `event_id` |

Triage from recent events; do not pull every conversation's history to answer
"any new DMs?".

## Sending

| Intent | Tool | Required |
|---|---|---|
| Message a person | `TWITTER_SEND_A_NEW_MESSAGE_TO_A_USER` | `participant_id` |
| Reply in a conversation | `TWITTER_SEND_DM_TO_CONVERSATION` | `dm_conversation_id` |
| Start a group | `TWITTER_CREATE_DM_CONVERSATION` | `conversation_type`, `participant_ids`, `message` |
| Delete a message | `TWITTER_DELETE_DM` | `event_id` |

`participant_id` is the numeric user id, not the handle — resolve it with
`TWITTER_USER_LOOKUP_BY_USERNAME` first.

A group conversation must be created before it can be messaged; there is no
implicit group send.

## Permissions

DM tools need the `dm.read` and `dm.write` scopes on the X app, and the
developer plan must include DM endpoints. A 403 here is usually the plan, not
the code — see [x-setup](../x-setup/SKILL.md).
