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
GET  /api/settings            brand voice, topics, cadence target, autoPublish
PUT  /api/settings            partial update
GET  /api/accounts?platform=  connected accounts and which one is active
POST /api/media               multipart file -> public URL
```

Read the brand voice before drafting anything the user will publish — it is the
same profile the app applies to its own drafts.
