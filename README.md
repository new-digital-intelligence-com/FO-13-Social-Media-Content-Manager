# socialmedia

Social media management for **Instagram** and **X (Twitter)**, in two forms:
**Claude Code plugins** (skills you invoke with `/instagram` or `/x`) and a
**Next.js app** (a full UI plus its own agent). Each platform shares one
behaviour contract across both surfaces.

## Setup — pick your path

The two surfaces use **different Composio products with different credentials**.
They are not interchangeable, and a connection made on one does not appear on
the other. Read the path you need.

### Path A · Claude Code plugin — no API key, no .env, no Node

```
/plugin marketplace add https://github.com/<you>/socialmedia
/plugin install instagram-manager
/plugin install x-manager
```

Then, once:

1. **Authorize Composio.** The plugin ships `.mcp.json`, so installing it
   registers the `composio` MCP server automatically. Run `/mcp`, select
   `composio`, and complete the browser sign-in. (Alternative, and Composio's
   own recommendation for Claude Code: install the CLI with
   `curl -fsSL https://composio.dev/install | sh` then `composio login`.)
2. **Connect Instagram.** Ask Claude to connect Instagram, or run `/instagram`.
   It returns a Connect Link; authorize a **Business or Creator** account.

That is the whole setup. This path uses **Composio For You**, which authenticates
through your browser — there is no `COMPOSIO_API_KEY`, no `.env.local`, and no
Groq key, because Claude itself is the model.

### Path B · The web app — API keys in `.env.local`

Requires **Node 22.22.3+** (the Composio TypeScript SDK is ESM-only and refuses
older versions; `.nvmrc` pins it).

```bash
nvm use
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
```

`.env.local` needs four values:

| Variable | Where it comes from | Why |
|---|---|---|
| `COMPOSIO_API_KEY` | [Dashboard](https://dashboard.composio.dev) → **Platform** → your project → Settings → API keys. Starts `ak_`. | Server-side tool execution |
| `COMPOSIO_TEST_USER_ID` | Written by `composio dev init`, or any stable string | Composio scopes connections per user |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys). Starts `gsk_`. | The app brings its own model; Claude is not in the loop |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Tool-capable model on Groq |

Then open the app and click **Connect Instagram** — it returns a Connect Link
for a Business or Creator account.

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
| Credential | Browser OAuth (`ck_`) | Project key (`ak_`) |
| Where connections live | Your personal Composio account | The project, scoped to `COMPOSIO_TEST_USER_ID` |
| Model | Claude | Groq |
| Needs Node / `.env` | No | Yes |

If you use both, authorize Instagram once per path. That is a property of
Composio's two products, not a bug here.

### What stays identical across both

`plugins/instagram-manager/skills/instagram/references/rules.md` is the single
behaviour contract. Claude loads it through the `instagram` skill; the app reads
the same file into its system prompt (`src/lib/skills.ts`). Change a rule once
and both surfaces follow it.

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
    instagram-insights/     account + post analytics, reporting rules
    instagram-engagement/   comments, replies, mentions, moderation
    instagram-messaging/    DMs, inbox triage, ice breakers
    instagram-content/      browse and audit the library
```

Install locally:

```
/plugin marketplace add /home/helmi/Desktop/socialmedia
/plugin install instagram-manager
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

## 2. Next.js app — direct UI + AI

Landing page lists social platforms (only Instagram is wired; the rest show as
not connected). Clicking Instagram opens a panel with eight tabs.

```
src/app/page.tsx                platform grid
src/app/instagram/page.tsx      panel shell + connect flow
src/components/panels/          Overview, Content, Messages, Insights, Compose, Chat
src/components/AiAssist.tsx     reusable "Ask AI" attached to every composer
src/components/MediaInput.tsx   upload-or-URL media picker with preview
src/lib/ig.ts                   typed tool execution + result unwrapping
src/app/api/ig/*                manual actions (direct tool calls, no LLM)
src/app/api/assist              AI writing help (tool-free, cheap)
src/app/api/chat                agent loop (tools, for "Ask AI" tab)
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
- **No native scheduling.** Publishing is immediate; a scheduler would need your
  own job store.
- **Expired stories are unreachable.** Only currently-active stories return.

### Why meta-tools instead of preloaded tools

Groq's free tier allows **8,000 tokens/min**. Measured:

| Config | Tokens |
|---|---|
| All 29 Instagram schemas preloaded | 16,239 — exceeds the limit |
| Meta-tools with sandbox enabled | 6,614 |
| **Meta-tools, sandbox disabled** | **3,529** |

So the agent loop uses `sandbox: { enable: false }` and discovers tools at
runtime. The manual UI routes bypass the LLM entirely, so they cost nothing
against this budget. Tuning lives in `TOKEN_BUDGET` in `src/lib/composio.ts`.

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
  x-lists/        create and curate lists
  x-messaging/    DMs including group conversations
```

App tabs: Overview, Compose (threads with live 280 counters, media, polls),
Timeline (home / bookmarks / liked with inline like·repost·bookmark), Search,
Lists, Messages, Ask AI.

Two X limits the UI states rather than hides: **there is no mentions endpoint**
(monitoring a handle means searching for it), and **recent search only reaches
about 7 days** on most plans, so "no results" means "none in that window".

## 4. `scripts/` — Python verification harness

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
- **`composio dev init` (CLI 0.4.0) wrote a masked API key** (`ak_…**zVAo`).
  `src/lib/composio.ts` and `scripts/composio_session.py` both fail fast on a
  masked or short key rather than surfacing an opaque 401.
