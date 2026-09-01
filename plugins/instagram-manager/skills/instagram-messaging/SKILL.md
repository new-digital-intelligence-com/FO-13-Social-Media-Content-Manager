---
name: instagram-messaging
description: Read and send Instagram direct messages, manage the DM inbox, and configure ice breakers. Use when the user wants to check DMs, reply to a customer, send a message or image in chat, mark a thread read, or set up automated greeting prompts.
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
> **"The options don't fit the tool's format" is not a reason to fall back to
> prose.** Discrete paths always fit. Only when the answer is genuinely
> free-text — a caption, a search term — do you ask in words, and then ask for
> that one thing plainly. If no such tool exists at all, use a **numbered list**,
> one option per line.

# Instagram messaging

Direct messages are private, one-to-one, and sent as the account. A wrong DM
cannot be recalled.

## Confirm before sending

Always show the recipient and the exact message text, then get agreement. Never
send to a list of people from one blanket approval -- confirm the recipient set
explicitly. Bulk unsolicited DMs violate Meta's platform policy and get accounts
restricted; if the user asks for mass outreach, say so rather than executing it.

## Reading the inbox

```
INSTAGRAM_LIST_ALL_CONVERSATIONS                    -> threads
INSTAGRAM_GET_PAGE_CONVERSATIONS   ig_user_id       -> threads for the linked Page
INSTAGRAM_GET_CONVERSATION         conversation_id  -> one thread
INSTAGRAM_LIST_ALL_MESSAGES        conversation_id  -> messages in a thread
```

Typical triage: list conversations, then pull messages only for the threads that
matter. Do not fetch every thread's history to answer "any new DMs?".

## Sending

```
INSTAGRAM_SEND_TEXT_MESSAGE  recipient_id + text
INSTAGRAM_SEND_IMAGE         recipient_id + image_url   (public URL)
INSTAGRAM_MARK_SEEN          recipient_id
```

`recipient_id` is the Instagram-scoped user ID from a conversation, not a
username. Get it by reading the thread first.

## The 24-hour window

Meta only allows free-form replies within **24 hours** of the user's last
message. Outside it, sends fail regardless of permissions. When a send fails,
check the last inbound message timestamp before assuming a permission problem.

## Ice breakers and the messenger profile

```
INSTAGRAM_GET_MESSENGER_PROFILE     ig_user_id
INSTAGRAM_UPDATE_MESSENGER_PROFILE  ig_user_id + ice_breakers
INSTAGRAM_DELETE_MESSENGER_PROFILE  ig_user_id + fields
```

Ice breakers are the tappable prompts shown before a conversation starts. Read
the current profile before updating -- an update replaces what is there, so an
unread update silently drops existing prompts.

## When messaging tools fail

A permission error usually means the Meta app lacks
`instagram_manage_messages`, which Meta must approve. The managed Composio app
may not carry it. See [instagram-setup](../instagram-setup/SKILL.md).
