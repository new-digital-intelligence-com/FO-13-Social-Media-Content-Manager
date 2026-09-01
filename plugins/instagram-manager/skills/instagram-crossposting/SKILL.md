---
name: instagram-crossposting
description: Publish or schedule one piece of content to Instagram and other platforms in a single call, with per-platform wording. Use when the user wants to post the same thing to Instagram and YouTube, X, TikTok, LinkedIn or elsewhere at once, asks to cross-post, or wants one caption adapted per network.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../instagram/references/artifact.md](../instagram/references/artifact.md).

> **When you need a decision from the user, ask with the question form.** Use
> the AskUserQuestion tool so they pick from real options with the trade-off
> spelled out on each, rather than reading a paragraph that ends in a question
> mark. Three rules keep it useful: never ask what you can find out yourself —
> read the queue, the settings and the connection state first; make every option
> a genuine choice with its consequence stated, not "yes / no"; and put the one
> you would recommend first, saying why. Anything irreversible — publishing,
> arming an automation, deleting — is confirmed this way, never assumed.

# Cross-posting from Instagram

One payload, several platforms, one queue slot. **Zernio-only** — Composio is
one toolkit per call, so cross-posting through it means separate sequential
publishes. Contract and failure ladder:
[references/zernio.md](../instagram/references/zernio.md).

## The shape

Add one entry per target to `platforms[]`. Each entry carries its own
`accountId` and its own `platformSpecificData`:

```json
POST /v1/posts
{
  "content": "the shared caption",
  "mediaItems": [{ "type": "video", "url": "https://..." }],
  "platforms": [
    { "platform": "instagram", "accountId": "<ig>" },
    { "platform": "youtube", "accountId": "<yt>",
      "platformSpecificData": { "title": "...", "visibility": "public" } }
  ],
  "queuedFromProfile": "<profileId>"
}
```

Add `queuedFromProfile` to queue it, `scheduledFor` + `timezone` for a named
time, or `publishNow: true` to send immediately.

## One caption rarely fits every platform

Use `customContent` on a platform entry to override the shared `content` for
that network. Reach for it whenever the platforms disagree, which is most of the
time:

- **Instagram** — 2,200 chars, only the first 125 show before the fold. Captions
  have no clickable links; put the link in `firstComment` instead.
- **YouTube** — the description is 5,000 chars and the *title* is a separate
  `platformSpecificData.title`, not the first line of your caption unless you
  leave it out.
- **X** — 280 chars.
- **Bluesky** — a hard 300, and the single most common cause of a failed
  cross-post. Always give it its own `customContent`.

Hashtags are not appended automatically; write them into the content. For
YouTube keywords use `tags`, not hashtags.

## Media has to satisfy every target at once

The strictest limit wins. Instagram caps video at 300 MB (100 MB for stories)
and 90 s for Reels; Instagram requires media on every post while X does not;
YouTube requires exactly one video and takes no image-only post. A payload that
is legal for one platform can be rejected by another.

Check the media against every target before sending, and say which platform
would reject it rather than letting the call fail halfway.

## Partial success is the normal failure

A cross-post can succeed on one platform and fail on another. The response
carries per-platform results, and `warnings` flags things that were accepted but
altered — media truncated for a platform, a field ignored.

**Report the outcome per platform, never as a single "posted".** If Instagram
went out and YouTube failed, say exactly that, and do not retry the whole
payload — that would double-post Instagram. Retry only the failed target.

## Confirm before sending

Cross-posting multiplies a mistake across accounts. Show every target account,
the per-platform text each will actually get, and the time, then get agreement.
Publishing is not reversible on any of them.

If Zernio is unavailable, cross-posting is unavailable. Offer to publish to each
platform separately through its own toolkit instead, and report each result
individually — but say up front that this loses the shared slot and the
all-or-nothing framing.
