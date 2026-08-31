---
name: x-messaging
description: Read and send X direct messages, including group conversations. Use when the user wants to check DMs, reply to someone, start a conversation, or delete a message on X.
---

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
