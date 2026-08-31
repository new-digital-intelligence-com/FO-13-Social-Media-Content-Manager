# Driving the Content Studio app

Some capabilities are not Instagram API features at all — they are built on
state the app keeps locally, so no Composio tool can reach them:

| Capability | Why it is app-only |
|---|---|
| Brand voice, escalation keywords, cadence target | Local settings |
| Multi-account switching | Local selection of which connected account acts |
| Media hosting | Cloudinary upload, to get a public URL |
| Cadence measurement | Derived from post history against a local target |

When the app is running (default `http://localhost:3000`), drive these over
HTTP. When it is not, say so plainly rather than pretending the capability is
missing from Instagram.

Set `CONTENT_STUDIO_URL` if it runs elsewhere. Check it is up before relying on
it: `GET /api/status` returns connection state for every platform.

## Queue and scheduling

```
GET    /api/ig/schedule?platform=  queue + counts, and `available`
POST   /api/ig/schedule            {platform, caption, mediaUrl, publishAt|useQueue, timezone}
PATCH  /api/ig/schedule            {id, publishAt}  — null returns it to a draft
DELETE /api/ig/schedule?id=        remove one
```

`publishAt` is ISO 8601; `null` keeps it a draft. Send `useQueue: true` instead
to take the profile's next free slot.

These routes are a **view onto Zernio**, not a local queue — the app's own
scheduler was removed. There is no approval step and no `/schedule/run`: setting
a time is the approval.

**`available: false` means Zernio could not be read**, not that the queue is
empty. Never report "nothing scheduled" from it.

## Cadence, monitoring, suggestions

```
GET /api/ig/cadence        target vs actual, days since last post, average gap
GET /api/ig/monitor        comments flagged as question / negative / escalation
GET /api/ig/suggestions    content ideas grounded in this account's own performance
GET /api/ig/growth         (POST) topic-based account discovery
```

## Settings

```
GET /api/settings          brand voice, avoid list, topics, cadence target,
                           escalation keywords
PUT /api/settings          partial update of any of those
```

Read the brand voice before drafting anything the user will publish; it is the
same profile the app applies to its own drafts.

## Accounts

```
GET    /api/accounts?platform=instagram   connected accounts, which is active
POST   /api/accounts                      {platform, label} -> Connect Link
PATCH  /api/accounts                      {platform, accountId} switch active
DELETE /api/accounts?platform=&accountId= disconnect
```

Several accounts can be connected per platform. Everything the app executes
runs as the active one — confirm which before acting on a request like "post
this", when more than one exists.

## Media hosting

```
POST  /api/media           multipart file -> {url, publicId, resourceType}
PATCH /api/media           {publicId, atSeconds} -> still frame from a video
```

Instagram fetches media from a public URL, so a local file has to be hosted
first. This is also the only way to obtain a Reel cover, which accepts a URL
and has no file equivalent.
