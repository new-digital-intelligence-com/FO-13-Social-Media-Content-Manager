# socialmedia

Social media management for **Instagram**, **X (Twitter)** and **YouTube**, in
two forms: **Claude Code plugins** (skills you invoke with `/instagram`, `/x` or
`/youtube`) and a **Next.js app** (a full UI plus its own agent). Each platform
shares one behaviour contract across both surfaces.

Two providers sit underneath: **Composio** executes platform API calls, and
**Zernio** owns what needs a server-side clock or engagement history — the
publishing queue, comment-to-DM automations, cross-posting, and measured
analytics. Zernio is optional: when it is unreachable, the features it backs
report themselves unavailable and the rest keeps working.

## Setup — pick your path

The two surfaces use **different Composio products with different credentials**.
They are not interchangeable, and a connection made on one does not appear on
the other. Read the path you need.

### Path A · Claude Code plugin — no API key, no .env, no Node

```
/plugin marketplace add https://github.com/<you>/socialmedia
/plugin install instagram-manager
/plugin install x-manager
/plugin install youtube-manager
```

Then, once:

1. **Authorize Composio.** The plugin ships `.mcp.json`, so installing it
   registers the `composio` MCP server automatically. Run `/mcp`, select
   `composio`, and complete the browser sign-in. (Alternative, and Composio's
   own recommendation for Claude Code: install the CLI with
   `curl -fsSL https://composio.dev/install | sh` then `composio login`.)
2. **Authorize Zernio** (Instagram and YouTube plugins). They ship the same
   `.mcp.json` with a second server, `https://mcp.zernio.com/mcp`. Run `/mcp`,
   select `zernio`, sign in. Skip it and everything except scheduling,
   automations, cross-posting and deep analytics still works.
3. **Connect the accounts.** Ask Claude to connect Instagram, or run
   `/instagram`. It returns a Connect Link; authorize a **Business or Creator**
   account. Repeat per platform, per provider.

All three plugins ship the **same** `.mcp.json`, so you authorize Composio once,
not once per plugin. Authorizing Composio and connecting an account are separate
steps: repeat step 2 for each platform you want.

That is the whole setup. This path uses **Composio For You**, which authenticates
through your browser — there is no `COMPOSIO_API_KEY`, no `.env.local` and no
model key, because Claude itself is the model.

### Path B · The web app — API keys in `.env.local`

Requires **Node 22.22.3+** (the Composio TypeScript SDK is ESM-only and refuses
older versions; `.nvmrc` pins it).

```bash
nvm use
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
```

`.env.local` needs these:

| Variable | Where it comes from | Why |
|---|---|---|
| `COMPOSIO_API_KEY` | [Dashboard](https://dashboard.composio.dev) → **Platform** → your project → Settings → API keys. Starts `ak_`. | Server-side tool execution |
| `COMPOSIO_TEST_USER_ID` | Written by `composio dev init`, or any stable string | Composio scopes connections per user |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API keys. Starts `sk-ant-`. | The app runs its own agent; the Claude Code session is not in the loop |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` (default), or `claude-sonnet-5` for harder work | The model the app's agent uses |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | [cloudinary.com](https://cloudinary.com) → Dashboard | Media hosting. An Instagram Reel cover and a YouTube thumbnail accept a **public URL only**, with no file equivalent, so those two need it |
| `ZERNIO_API_KEY` | [zernio.com](https://zernio.com) → Settings → API keys. `sk_` + 64 hex chars, shown once. | Scheduling, automations, cross-posting, measured analytics. **Optional** — omit it and those features report as unconfigured |
| `ZERNIO_PROFILE_ID` | The `profileId` on any connected Zernio account | The profile that owns queue slots |

Three more are optional and documented in `.env.example`: `IG_LOOKUP_*` for
Instagram handle verification in the Grow tab (leave blank and suggestions stay
unverified), and `WEB_SEARCH` / `WEB_SEARCH_TOOL_TYPE` for account discovery.

Then open the app and click **Connect** on a platform — it returns a Connect
Link. Instagram requires a Business or Creator account.

> **Reveal the key before copying.** The dashboard shows it masked, and
> `composio dev init` on CLI 0.4.0 can persist the masked form (`ak_…**zVAo`),
> which the API rejects with a confusing 401. Both entrypoints fail fast on a
> masked or short key rather than surfacing that 401.

### X needs your own developer app

Instagram can use Composio's managed OAuth app. **X cannot** — Composio removed
managed Twitter credentials in February 2026. Until you supply your own
credentials, creating an X session fails outright:

```
The following toolkits require auth configs but none exist and cannot be
auto-created: twitter. Please specify them in auth_configs.   (code 4300)
```

So X takes three steps, which the app's `/x` tab walks you through:

1. In the [X developer portal](https://developer.x.com/en/portal/dashboard),
   create a **Project**, then an **App inside it**, and enable OAuth 2.0. An app
   not attached to a Project causes `client-not-enrolled` errors later.
2. Paste the client ID and secret into the setup wizard. The app stores them as
   a Composio custom auth config with `isEnabledForToolRouter: true` — without
   that flag, sessions cannot see the config.
3. Authorize the account.

X also gates endpoints by **plan tier**: a 403 usually means your plan lacks
that endpoint, and `UsageCapExceeded` is the monthly post cap. Neither is
fixable in code.

### Why you may end up connecting Instagram twice

| | Path A (plugin) | Path B (app) |
|---|---|---|
| Composio product | For You | Platform |
| Zernio credential | Browser OAuth via `/mcp` | `ZERNIO_API_KEY` in `.env.local` |
| Credential | Browser OAuth (`ck_`) | Project key (`ak_`) |
| Where connections live | Your personal Composio account | The project, scoped to `COMPOSIO_TEST_USER_ID` |
| Model | Claude, no key needed | Claude, your `ANTHROPIC_API_KEY` |
| Needs Node / `.env` | No | Yes |

If you use both, authorize Instagram once per path. That is a property of
Composio's two products, not a bug here.

### What stays identical across both

Each platform has one behaviour contract, at
`plugins/<platform>-manager/skills/<platform>/references/rules.md`. Claude loads
it through the router skill; the app reads **the same file off disk** into its
system prompt (`src/lib/skills.ts`). Change a rule once and both surfaces follow
it.

## 1. `plugins/instagram-manager` — Claude Code plugin

Skills that teach Claude to run an Instagram Business/Creator account.

```
.claude-plugin/marketplace.json
plugins/instagram-manager/
  .claude-plugin/plugin.json
  skills/
    instagram/              router + shared rules + references/tools.md
    instagram-setup/        connect, verify account type, diagnose auth
    instagram-publishing/   images, reels, stories, carousels, quotas
    instagram-scheduling/   the publishing queue, cadence, what goes out next
    instagram-insights/     account + post analytics, reporting rules
    instagram-engagement/   comments, replies, mentions, moderation
    instagram-monitoring/   triage comments for questions, complaints, escalation
    instagram-messaging/    DMs, inbox triage, ice breakers
    instagram-growth/       account discovery by topic, and why follows cannot
                            be automated on Instagram
    instagram-content/      browse and audit the library
    instagram-automation/   comment-to-DM + story-reply automations, private
                            replies                              [Zernio]
    instagram-crossposting/ one payload to several platforms      [Zernio]
```

The scheduling, monitoring and growth skills reach capabilities Instagram's API
does not have — see [Some capabilities live only in the app](#some-capabilities-live-only-in-the-app).

Install locally:

```
/plugin marketplace add /path/to/this/repo
/plugin install instagram-manager
/plugin install x-manager
/plugin install youtube-manager
```

### The plugin ships its own Composio connector

A skill is instructions only — it carries no tool access. For `/instagram` to
actually *do* anything in Claude, Composio tools must be reachable. The plugin
therefore ships `.mcp.json` pointing at `https://connect.composio.dev/mcp`, so
enabling it registers the connector too (`/mcp` shows status and authorizes).
The Composio CLI (`composio login`) is the supported alternative and is
Composio's own recommendation for Claude Code.

Tool access and Instagram account authorization are separate steps; having one
does not imply the other.

### One contract, both surfaces

`skills/instagram/references/rules.md` is the behaviour contract: account facts,
tool discipline, when to confirm, how to report. Claude loads it through the
`instagram` skill, and the web app reads **the same file** into its agent system
prompt (`src/lib/skills.ts`). Change a rule once and both surfaces follow it.

Verified: asking the app to change the bio returns the same refusal-plus-workaround
Claude gives, with zero tool calls.

Every tool slug is verified against Composio toolkit `INSTAGRAM` (`20260819_00`);
the skills route away from Meta's eight deprecated tools and require
confirmation before anything public or irreversible.

### Some capabilities live only in the app

A few things are not platform API features at all — they are built on state the
app keeps locally, so no Composio tool reaches them:

| Capability | Why it is app-only |
|---|---|
| Publishing queue and scheduling | Instagram has no scheduling API; the queue is local |
| Auto-publish and the background runner | Local setting plus a server-side timer |
| Brand voice, escalation keywords, cadence target | Local settings |
| Multi-account switching | Local choice of which connected account acts |
| Media hosting | Cloudinary upload, to get a public URL |
| Cadence measurement | Post history against a local target |

The skills do not reimplement any of this. They drive the running app over HTTP
(`CONTENT_STUDIO_URL`, default `http://localhost:3000`), checking
`GET /api/status` first — see each plugin's `references/app-api.md`. **If the app
is not running, those capabilities are unavailable in Claude Code**, and the
skills are told to say so plainly rather than blame the platform's API.

**Scheduling is the exception, and now prefers Zernio.** The local queue in
`.data/` only fires while `npm run dev` is running and never retries; Zernio
holds the post server-side, retries three times with exponential backoff, and
supports recurring slots. The skills queue on Zernio first and drop to the app's
queue only when Zernio is unreachable — saying which one they landed on. The
app's Queue and Automation tabs are unchanged and still work.

## 2. Next.js app — direct UI + AI

The landing page lists all three platforms; each opens its own panel with a
connect flow and a tab strip.

| Platform | Tabs |
|---|---|
| Instagram | Overview, Posts, Reels, Stories, Messages, Insights, Compose, Queue, Monitor, Grow, Automation, Ask AI |
| X | Overview, Compose, Timeline, Search, Lists, Grow, Messages, Ask AI |
| YouTube | Overview, Videos, AI Studio, Upload, Comments, Playlists, Grow, Search, Ask AI |

```
src/app/page.tsx                platform grid
src/app/{instagram,x,youtube}/  panel shell + connect flow per platform
src/components/panels/          Overview, Content, Messages, Insights, Compose,
                                Queue, Monitor, Automation, Chat
src/components/{x,yt}/          per-platform panels; YtStudio is the transcript workbench
src/components/GrowthPanel.tsx  shared Grow tab, parameterised by platform
src/components/AiAssist.tsx     reusable "Ask AI" attached to every composer
src/components/MediaInput.tsx   upload-or-URL media picker with preview
src/lib/{ig,x,yt}.ts            typed tool execution + result unwrapping
src/lib/store.ts                JSON store under .data/ (queue, settings, selection)
src/lib/cloudinary.ts           public-URL hosting for Reel covers + YT thumbnails
src/lib/zernio.ts               Zernio client; never throws, degrades instead
src/app/api/{ig,x,yt}/*         manual actions (direct tool calls, no LLM)
src/app/api/assist              AI writing help (tool-free, cheap)
src/app/api/{chat,x/chat,yt/chat}  agent loop (tools, for each "Ask AI" tab)
src/app/api/status              connection state for every platform
```

Every feature works two ways: **manually** through the UI (deterministic direct
tool calls, no tokens spent) or by **asking the AI** in the Ask AI tab. Composers
carry inline AI help — captions, hashtags, reel scripts, comment and DM replies.

```bash
nvm use            # Node 22 — the Composio TS SDK needs >= 22.22.3
npm run dev        # http://localhost:3000
```

### Design templates

Compose can start from a template instead of an existing file. Templates render
on a canvas at true Instagram dimensions (1080×1080, 1080×1350, 1080×1920),
export as JPEG, and go through the same upload path — so no image service is
needed. Six templates (bold statement, photo overlay, quote card, split feature,
tip list, announcement) with palette variants, editable copy, an optional photo
slot, and live preview. Carousel slides can each be designed separately.

### Media: upload or URL

Every media field takes either an **uploaded file** (default) or a public URL.
Uploads go to `/api/ig/upload`, which stages the file with
`composio.files.upload({ file, toolSlug, toolkitSlug })` and returns a
`{ name, mimetype, s3key }` descriptor. Composio hosts it on a temporary public
URL, which is how an upload works where a local file cannot — Meta fetches media
server-side. The descriptor is passed to `INSTAGRAM_POST_IG_USER_MEDIA` as
`image_file` / `video_file`.

Pass a Web `File`, not a Buffer: the SDK rejects raw buffers, and a bare path
string loses the mimetype (it becomes `application/octet-stream`). Uploads are
rejected early above 8 MB (image) / 100 MB (video), or for non-media types.

The UI is light-mode only; `color-scheme: light` in `globals.css` pins native
controls to match.

### What Instagram does not allow

- **No bio, name, website or profile-picture editing.** Meta's Graph API exposes
  no endpoint for it, for any tool. The Overview tab shows the bio read-only and
  can draft a new one for you to paste into the app.
- **No native scheduling.** Instagram publishes immediately. The Queue and
  Automation tabs are the app's own scheduler on top of `.data/`, not an
  Instagram feature — which is why they exist only in the app.
- **Expired stories are unreachable.** Only currently-active stories return.

### Why meta-tools instead of preloaded tools

The pattern was forced by the original model provider's **8,000 tokens/min** cap.
Measured then:

| Config | Tokens |
|---|---|
| All 29 Instagram schemas preloaded | 16,239 — exceeds the limit |
| Meta-tools with sandbox enabled | 6,614 |
| **Meta-tools, sandbox disabled** | **3,529** |

That cap is gone — the app now runs on Claude Haiku 4.5 with a 200K context
window — but the pattern stayed, because it keeps prompts small and lets **one
session serve any toolkit** rather than preloading three platforms' schemas. So
the agent loop still uses `sandbox: { enable: false }` and discovers tools at
runtime via `COMPOSIO_SEARCH_TOOLS` / `COMPOSIO_GET_TOOL_SCHEMAS`. The manual UI
routes bypass the LLM entirely and cost nothing. Tuning lives in `TOKEN_BUDGET`
in `src/lib/composio.ts`.

> Haiku 4.5 predates adaptive thinking and `output_config.effort`; both are
> rejected on this model, so neither is set anywhere in the app.

## 3. `plugins/x-manager` + `/x` — X (Twitter)

79 tools, of which **51 are wired directly** into UI routes; the rest stay
reachable through the Ask AI tab's runtime discovery.

```
plugins/x-manager/skills/
  x/              router + rules.md + references/tools.md
  x-setup/        the three-step credential flow, plan tiers, error decoding
  x-posting/      posts, threads, replies, quotes, media, polls
  x-engagement/   like, repost, bookmark, hide replies, follow, mute
  x-monitoring/   recent + archive search, counts, analytics
  x-growth/       account discovery by topic, bulk follow/unfollow with review
  x-lists/        create and curate lists
  x-messaging/    DMs including group conversations
```

App tabs: Overview, Compose (threads with live 280 counters, media, polls),
Timeline (home / bookmarks / liked with inline like·repost·bookmark), Search,
Lists, Messages, Ask AI.

Two X limits the UI states rather than hides: **there is no mentions endpoint**
(monitoring a handle means searching for it), and **recent search only reaches
about 7 days** on most plans, so "no results" means "none in that window".

## 4. `plugins/youtube-manager` + `/youtube` — YouTube

```
plugins/youtube-manager/skills/
  youtube/             router + rules.md + references/tools.md
  youtube-setup/       connect a channel, decode quota and 403 errors
  youtube-publishing/  uploads, titles, descriptions, tags, thumbnails, privacy
  youtube-content/     transcript-driven summaries, chapters, repurposing
  youtube-studio/      the same workbench as the app's AI Studio tab
  youtube-comments/    read, reply, moderate
  youtube-growth/      playlists, subscriptions, search, trending
  youtube-scheduling/  queued uploads, drip-feeding a batch       [Zernio]
  youtube-analytics/   retention, demographics, daily views       [Zernio]
```

App tabs: Overview, Videos, AI Studio, Upload, Comments, Playlists, Grow,
Search, Ask AI.

**Transcripts are the point.** `YOUTUBE_LIST_CAPTION_TRACK` then
`YOUTUBE_LOAD_CAPTIONS` gives the actual words in a video, and the rules forbid
describing, summarising, chaptering or repurposing a video from its title and
thumbnail. With no caption track, both surfaces work from metadata and say so
rather than guessing. AI Studio turns a transcript into chapters, descriptions,
titles, tags — and into Instagram or X posts.

Three YouTube constraints the surfaces state rather than hide:

- **Quota is metered in units, not requests**, and writes cost far more than
  reads — an upload is ~1600 against a default 10,000/day. Composio's shared
  managed OAuth app splits that quota across users, so it runs out sooner than
  expected; a dedicated Google Cloud OAuth app gets its own. Quota resets daily
  on Pacific time, so `quotaExceeded` is wait-or-upgrade, never retry-in-a-loop.
- **Ids are not interchangeable.** Channel, video, playlist and playlist *item*
  ids are four different things — removing a video from a playlist takes the
  playlist item id.
- **Uploads default to `private`** unless you explicitly ask to publish.

A YouTube thumbnail is URL-only (`thumbnailUrl` has no file equivalent), which
is one of the two reasons the app needs Cloudinary.

## 5. Zernio — the second provider

Composio answers "do this on Instagram now". Zernio answers "do this later,
repeatedly, and tell me whether it worked" — anything needing a server-side
clock or history across posts.

| Owned by Zernio | Why not Composio |
|---|---|
| Scheduled posts, queue slots, drip-feed | Instagram has no scheduling API; something must hold the post |
| Retry on failure | 3 attempts, exponential backoff, then a webhook |
| Comment-to-DM and story-reply automations | No Instagram tool does this at all |
| Private reply to a commenter | Instagram supports it; the toolkit does not expose it |
| Best time to post, content decay, frequency-vs-engagement | Needs history across posts |
| YouTube retention, demographics, daily views | Not in the Data API; needs `yt-analytics` |
| Cross-posting one payload to several platforms | Composio is one toolkit per call |

Everything else stays on Composio. Contracts live in
`plugins/{instagram,youtube}-manager/skills/{instagram,youtube}/references/zernio.md`.

### Designed to be absent

Zernio is a remote service that will sometimes be down, and the whole
integration is built around that rather than assuming uptime.

- **The app never breaks.** `src/lib/zernio.ts` throws nothing — not at import,
  not on failure. Every call returns a discriminated result, and requests carry
  a timeout so an unreachable Zernio cannot hang the page that called it.
  `GET /api/status` reports `zernio.state` as `ready`, `unconfigured`,
  `unavailable` or `error`; features read it and disable themselves rather than
  failing mid-action.
- **The skills state which rung they landed on.** Scheduling falls back to the
  app's local queue (weaker: only fires while the app is up — the skills say
  so). Analytics falls back to Composio's shallower numbers, explicitly
  labelled. Automations, private replies and cross-posting have **no** fallback
  and are reported unavailable rather than approximated.
- **The failure is read, not retried blindly.** 401 is re-authorize, 403
  `ACCOUNT_DISCONNECTED` is reconnect, 409 is a content-hash duplicate that
  surfaces the original post, 429 backs off, 5xx and timeouts mean outage. A
  failed publish is never retried blindly, since the first attempt may have
  partly succeeded.
- **Configured ≠ reachable ≠ usable.** A missing key is a setup task, not an
  outage, and the two are reported differently. So is an empty queue: a profile
  with no slots returns 404 on `/queue/slots`, which means "configure slots",
  not "Zernio is down".

Duplicate protection is worth knowing: a repeated `x-request-id` within ~5 min
returns the original post (HTTP 200, a retry), and identical content to the same
account within 24 h is rejected 409. The app sends a fresh UUID per call.

## 6. `scripts/` — Python verification harness

Proved the connection before any app code existed. Still the quickest way to
test one tool call:

```bash
.venv/bin/python scripts/connect_and_call.py INSTAGRAM INSTAGRAM_GET_USER_INFO
```

## Constraints worth knowing

- **Instagram supports Business/Creator accounts only.** Personal accounts are
  rejected by Instagram's API.
- **Publishing needs a publicly reachable media URL** — Meta fetches it
  server-side.
- **Comment and DM tools may need Meta permissions** the Composio-managed OAuth
  app does not carry; production needs your own Meta app.
- **X requires your own developer app** — Composio removed managed Twitter
  credentials in February 2026 — and gates endpoints by plan tier.
- **YouTube is quota-limited, not rate-limited.** Budget in units per day, not
  requests per minute.
- **Zernio can be unavailable, and that is a designed-for state**, not an error
  path to patch. Anything time-based or history-based degrades; nothing else
  should notice.
- **Zernio does not buy YouTube quota.** It publishes through the same Data API,
  so a scheduled upload spends its ~1600 units when it is created, not when it
  goes live.
- **The app is single-user by construction.** `COMPOSIO_TEST_USER_ID` is read
  from the environment, `.data/` is one global JSON store, and there is no auth
  layer — fine on localhost, not on a public URL. `getSession(user)`,
  `getXSession(user)` and `getYtSession(user)` already take a user id, so
  multi-user means adding auth and threading the real id through.
- **`composio dev init` (CLI 0.4.0) wrote a masked API key** (`ak_…**zVAo`).
  `src/lib/composio.ts` and `scripts/composio_session.py` both fail fast on a
  masked or short key rather than surfacing an opaque 401.
