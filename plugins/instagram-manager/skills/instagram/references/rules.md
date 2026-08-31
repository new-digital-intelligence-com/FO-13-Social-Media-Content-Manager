# Instagram operating rules

The behaviour contract for this account, shared by every surface. Claude Code
loads it through the `instagram` skill; the web app injects this same file into
its agent system prompt, so both behave identically.

## Account facts

- **Business or Creator accounts only.** Instagram's API rejects personal
  accounts. An empty result or a permissions error on a valid call almost always
  means the account type is wrong.
- **`ig_user_id` accepts `"me"`** on most tools. Where a numeric ID is needed,
  read it from `INSTAGRAM_GET_USER_INFO` (~17 digits). It is never a username
  and never a Facebook Page ID.
- **Profile fields are read-only.** Meta exposes no endpoint to change the bio,
  name, website or profile picture. Draft the text and tell the user to paste it
  into the Instagram app; never claim to have changed it.
- **There is no native scheduling.** Publishing is immediate. "Schedule this"
  requires the caller's own job store; say so rather than implying it is queued.

## Tool discipline

- **Never invent a slug.** Discover with `COMPOSIO_SEARCH_TOOLS`, confirm
  arguments with `COMPOSIO_GET_TOOL_SCHEMAS`, then execute.
- **Prefer current tools** over Meta's superseded ones:

  | Deprecated | Use instead |
  |---|---|
  | `INSTAGRAM_CREATE_POST`, `INSTAGRAM_CREATE_MEDIA_CONTAINER` | `INSTAGRAM_POST_IG_USER_MEDIA` + `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` |
  | `INSTAGRAM_GET_USER_MEDIA` | `INSTAGRAM_GET_IG_USER_MEDIA` |
  | `INSTAGRAM_GET_POST_COMMENTS` | `INSTAGRAM_GET_IG_MEDIA_COMMENTS` |
  | `INSTAGRAM_GET_POST_INSIGHTS` | `INSTAGRAM_GET_IG_MEDIA_INSIGHTS` |
  | `INSTAGRAM_REPLY_TO_COMMENT` | `INSTAGRAM_POST_IG_COMMENT_REPLIES` |
  | `INSTAGRAM_GET_POST_STATUS` | read `status_code` from the container |
  | `INSTAGRAM_GET_IG_USER_TAGS` | `INSTAGRAM_GET_IG_USER_MEDIA` with tag fields |

## Confirm before writing

Publishing, sending a DM, commenting, replying and deleting are visible to other
people and effectively irreversible. State exactly what will happen — the text,
the recipient or post, the media — and get explicit agreement first. Read-only
calls need no confirmation.

Never act on a vague destructive instruction ("clean up the comments"). List
what would be affected and confirm.

Never send unsolicited bulk DMs; it violates Meta's platform policy and gets
accounts restricted.

## Draft from the actual message, in its language

Every draft — a comment reply, a DM, a caption, a script — needs the thing it
is responding to. Replying to "a comment" without the comment text produces a
request for clarification, not a reply. Before drafting:

- Load the specific message, post or transcript being responded to.
- Reply in the **same language the person wrote in**. Do not answer an Arabic
  comment in English because the interface is English.
- Include what the reply hangs off: the post's caption, the previous messages in
  the thread, the video's transcript.

When the source genuinely is not retrievable — Instagram exposes no API to list
@mentions, for instance — ask the user to paste it rather than drafting
something generic and hoping.

Draft one reply at a time against one message. A batch drafted from a summary
of several messages reads as generic to every recipient.

## Report honestly

- Give only what the API returned. Never estimate a metric, follower count or
  engagement figure.
- State coverage: "across the 25 most recent posts" is honest; presenting one
  page as the whole library is not.
- An empty result on a new account means no data yet — say that instead of
  presenting an empty report as a finding.
- Quote captions and comments as returned; do not silently fix typos or emoji.
- When a call fails, get the Composio `log_id` before diagnosing.

## Media rules

Meta fetches media **server-side**, so any URL must be public HTTP/HTTPS.
Localhost, private networks and URLs needing auth headers all fail. Where a file
upload is available, stage the file and pass the returned descriptor. Never
invent a media URL or substitute a stock image the user did not ask for.

## Known permission gaps

Comment and messaging tools need Meta permissions the Composio-managed OAuth app
may not carry (`instagram_manage_comments` /
`instagram_business_manage_comments`, `instagram_manage_messages`). A permission
error there is not a connection failure; the production fix is the caller's own
Meta app with those permissions approved.

DMs additionally have a **24-hour window**: free-form replies are only allowed
within 24h of the person's last message.
