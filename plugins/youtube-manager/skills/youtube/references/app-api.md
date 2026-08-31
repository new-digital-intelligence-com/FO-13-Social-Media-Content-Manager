# Two ways to reach the same capability

Every feature works from either surface. The only difference is how the
connection is made:

| | Claude Code | Content Studio app |
|---|---|---|
| Connection | Composio connector (MCP or CLI) | Composio SDK session |
| Credential | Browser OAuth | Project API key |
| Everything else | identical tools, identical rules | identical tools, identical rules |

So a YouTube capability that is a plain tool call — posting, reading, engaging,
searching — behaves the same in both. Use the tools directly.

## What is genuinely app-only

A few capabilities are not YouTube API features at all. They are built on state
the app keeps locally, so no tool can reach them:

- the publishing queue and any scheduling
- brand voice, escalation keywords and other settings
- which connected account is currently active, when several exist
- media hosting, to turn a local file into a public URL

When the app is running (default `http://localhost:3000`, or
`CONTENT_STUDIO_URL`), drive those over HTTP. When it is not, say the
capability is unavailable rather than implying the platform lacks it.

```
GET  /api/status              connection state for every platform
GET  /api/settings            brand voice, topics, cadence target
PUT  /api/settings            partial update
GET  /api/accounts?platform=  connected accounts and which one is active
POST /api/media               multipart file -> public URL
```

Read the brand voice before drafting anything the user will publish — it is the
same profile the app applies to its own drafts.

## Zernio capabilities over HTTP

The app exposes the Zernio-backed capabilities on its own API, so a skill can
use them without the Zernio MCP connector — useful when the app is running but
the connector is not authorized. Same implementation as the app's UI and its
agent, so all three stay in step.

```
GET  /api/zernio/analytics?metric=&platform=&videoId=
     metric: best-time | decay | frequency | ig-demographics | ig-followers
             yt-channel | yt-daily-views | yt-demographics | yt-retention

GET  /api/zernio/automations            list comment-to-DM automations + stats
GET  /api/zernio/automations?logsFor=   firings for one automation
POST /api/zernio/automations            {keywords[], dmMessage, platformPostId?, trigger?}
PATCH /api/zernio/automations           {id, isActive}
DELETE /api/zernio/automations?id=

POST /api/zernio/crosspost              {content, mediaUrl?, targets[], publishAt?|useQueue}
GET  /api/zernio/queue                  queue slots (empty = queueing impossible yet)
GET  /api/zernio/queue?preview=5        upcoming slot times, for display only
POST /api/zernio/queue                  {name, timezone, slots[]}
```

**Status codes carry meaning.** `400` with `needsSetup: true` is a configuration
gap the user can fix now; `503` is Zernio being unreachable and there is nothing
to fix. Do not treat them the same, and do not retry a 400.
