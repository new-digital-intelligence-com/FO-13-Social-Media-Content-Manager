# YouTube operating rules

The behaviour contract for this channel, shared by every surface. Claude Code
loads it through the `youtube` skill; the web app injects the same file into
its agent prompt, so both behave identically.

## Account facts

- **Quota is the real constraint.** YouTube meters the Data API by units, not
  by request count, and writes cost far more than reads (an upload is ~1600
  units against a default 10,000/day). A shared managed OAuth app splits that
  quota across users, so exhaustion arrives sooner than expected. A dedicated
  Google Cloud OAuth app gives the project its own quota.
- **Quota resets daily** on Pacific time. A quota error is a wait-or-upgrade
  situation, never something to retry in a loop.
- **Ids are case-sensitive** and not interchangeable: a channel id, a video id,
  a playlist id and a playlist *item* id are four different things. Removing a
  video from a playlist takes the playlist item id, not the video id.

## Tool discipline

- **Never invent a slug.** Discover with `COMPOSIO_SEARCH_TOOLS`, confirm
  arguments with `COMPOSIO_GET_TOOL_SCHEMAS`, then execute.
- `YOUTUBE_LIST_COMMENT_THREADS` is deprecated — use
  `YOUTUBE_LIST_COMMENT_THREADS2`.
- Most read tools need an explicit `part` (`snippet`, `statistics`,
  `contentDetails`, `status`). Request only the parts you need; each one costs
  quota and context.

## Load the transcript before discussing a video

Captions are the highest-value read on YouTube. `YOUTUBE_LIST_CAPTION_TRACK`
then `YOUTUBE_LOAD_CAPTIONS` gives the actual words in the video.

**Never describe, summarise, chapter or repurpose a video from its title and
thumbnail.** If no caption track exists, say so and work from metadata,
labelling it as such — do not guess at content.

## Confirm before writing

Uploading, publishing, editing metadata, replacing a thumbnail, deleting a
video or playlist, and moderating comments are all visible and mostly
irreversible. State exactly what will happen and get agreement first.

- **Upload as `private` unless the user explicitly asks to publish.** A public
  upload notifies subscribers and cannot be un-notified.
- **Deleting a video is permanent** and takes its views, comments and links
  with it. Never delete on a vague instruction.
- Editing a title or description on a performing video affects its search
  placement; say so before rewriting one.

## Moderation is not censorship

`YOUTUBE_SET_COMMENT_MODERATION_STATUS` and `YOUTUBE_MARK_COMMENT_AS_SPAM`
affect a real person's comment, and `banAuthor` is severe. Only act on explicit
instruction, list what would be affected, and never bulk-moderate on sentiment
alone.

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

- Give only what the API returned. Never estimate views, watch time or revenue
  — the Data API does not expose watch time or revenue at all; that is YouTube
  Analytics, a different API not in this toolkit.
- Statistics can be hidden by the channel owner; absent is not zero.
- State coverage when listing: say how many videos you actually examined.
