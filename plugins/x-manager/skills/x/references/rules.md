# X (Twitter) operating rules

The behaviour contract for this account, shared by every surface. Claude Code
loads it through the `x` skill; the web app injects the same file into its agent
prompt, so both behave identically.

## Account facts

- **Composio has no managed X app.** Managed credentials were removed in
  February 2026. The account cannot connect until an auth config built from the
  user's own X developer app exists. A session scoped to `twitter` fails with
  code 4300 until then — that is setup, not a bug.
- **X needs three credentials, not two:** `client_id`, `client_secret`, and
  `generic_id` — the app-only **Bearer Token**, all from the same app. Search,
  counts, label stream and compliance jobs are app-only endpoints that a user
  token cannot reach. A missing bearer token fails with code 301,
  `Missing required field "Application Bearer Token"`.
- **Access is tiered.** X gates endpoints by developer plan. A 403 usually means
  the plan lacks that endpoint, not that the call is malformed.
- **Rate limits are per app**, and posting has a monthly cap. `UsageCapExceeded`
  is a quota state; do not retry in a loop.
- **280 characters** for a normal post. X counts URLs and unicode by its own
  rules, so treat 280 as a ceiling and leave headroom. Longer content becomes a
  thread of replies, never a truncated post.

## Tool discipline

- **Never invent a slug.** Discover with `COMPOSIO_SEARCH_TOOLS`, confirm
  arguments with `COMPOSIO_GET_TOOL_SCHEMAS`, then execute.
- Many endpoints need the acting account's numeric user id, not the handle.
  Get it once from `TWITTER_USER_LOOKUP_ME` and reuse it.
- A thread is successive replies: each post passes the previous post's id as
  `reply.in_reply_to_tweet_id`. There is no thread endpoint.
- **X has no mentions endpoint here.** Monitoring a handle means searching for
  it with `TWITTER_RECENT_SEARCH`. Say so rather than implying live mentions.

## Confirm before writing

Posting, replying, deleting, reposting, liking, following, muting, blocking,
editing lists and sending DMs are all visible to other people and mostly
irreversible. State exactly what will happen and get agreement first. Read-only
calls need no confirmation.

Deleting a post is permanent. Never delete on a vague instruction; list what
would go and confirm each one.

Never send unsolicited bulk DMs or mass-follow: both violate X's rules and get
accounts limited.

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

- Give only what the API returned. Never estimate impressions or reach.
- State coverage: recent search reaches roughly the last 7 days on most plans,
  so "no results" means "none in that window", not "never happened".
- Full-archive search needs a higher access tier; if it fails, say the plan is
  the reason.
- Quote post text exactly; do not silently fix typos.
- When a call fails, get the Composio `log_id` before diagnosing.

## Known failure modes

- `client-not-enrolled` / `App not linked to project` — the X app is not
  attached to a Project in the developer portal, or the OAuth config is stale.
  Fix the app, then recreate the connection if it is already `EXPIRED`.
- `403` — the developer plan lacks that endpoint.
- `UsageCapExceeded` / `429` — per-app rate limit or monthly post cap.
