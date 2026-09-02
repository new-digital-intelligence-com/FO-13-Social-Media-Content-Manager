# The Content Studio artifact

There is **one** artifact for this whole toolkit — a single Content Studio page
covering Instagram, X and YouTube — and the skills are its backend. Never
publish one artifact per skill or per question: you keep updating the same page.

In the Claude app and on claude.ai, work through it. In a terminal there is no
artifact viewer, so answer in text.

## The loop

1. **Find the studio.** If this conversation already published it, republish to
   the same file path. If not, list the user's artifacts and look for the one
   titled **Content Studio**; pass its `url` so the update lands on it.
2. **Only create one when none exists.** Start from
   [`content-studio.html`](content-studio.html) beside this file.
3. **Run the skill.** Fetch whatever the user asked for with your connectors —
   that is the backend.
4. **Fill `DATA` and republish.** The template renders entirely from one `DATA`
   object at the bottom of the file. Replace it, keep everything above it, and
   publish to the same URL.

The page is the interface; you are the runtime behind it. A question about the
queue updates `data.instagram.queue` and republishes — it does not produce a
second artifact.

## The DATA contract

Every key is optional, and **absent means something different from empty**:

- A key you did not fetch → leave it **out**. The section renders "not loaded
  yet".
- A key you fetched that has nothing in it → set `[]`. The section renders
  "nothing here".

Those must never look alike, which is the single most important rule in this
page. Do not fill a section with `[]` just because a fetch failed.

```js
DATA = {
  updated: "ISO timestamp of this refresh",
  connectors: [{ name, does, connected, detail }],   // see below — THREE states
  platforms:  [{ id, label, handle, connected }],   // instagram | x | youtube
  alerts:     [{ level: "warn"|"error", text }],    // studio-wide problems
  data: {
    instagram: {
      overview:    { stats: [{label, value}], window, note },
      posts:       [{ caption, thumbnail, stats, when }],   // also reels, stories
      reels:       [...], stories: [...],
      messages:    [{ from, text, when, reply, tag, tone }],
      insights:    { stats, bestTime: [{label, value, post_count}] },
      compose:     { text },
      queue:       { available: true, posts: [{caption, publishAt, status}] },
      monitor:     [{ author, text, on, reply, tag, tone }],
      grow:        [{ handle, why, followers, verified }],
      automations: [{ name, keywords, scope, active, stats }],
      crosspost:   { targets: [{ platform, label, text, note, blocked }] },
    },
    x: {
      overview, compose, messages, grow,            // same shapes as above
      timeline: [{ author, text, when, stats }],    // also `search`
      lists:    [{ name, description, count }],
    },
    youtube: {
      overview, compose, queue, insights, grow, search,
      videos:    [{ title, thumbnail, stats, when }],
      studio:    { video, noTranscript, outputs: { Summary: "...", Chapters: "..." } },
      upload:    { title, description, tags: [], visibility },
      comments:  [{ author, text, on, reply, tag }],
      playlists: [{ name, description, count }],
    },
  },
}
```

Details that matter:

- `queue.available: false` plus `queue.detail` is the **unreadable** queue — an
  outage, not an empty queue. Use it whenever the provider could not answer.
- `post.status` is `scheduled` | `draft` | `published` | `failed`. A draft must
  read as "will not publish"; the template does that for you.
- `bestTime[].label` is **already converted to local time**. The provider returns
  UTC hours and `day_of_week` 0=Monday — convert before you put it in `DATA`, and
  always carry `post_count` so thin data reads as thin.
- `alerts` is where a cross-cutting problem goes — reads and writes landing on
  different accounts, a provider down, a queue with no slots configured.
- A stat that could not be fetched is `value: null`, never `0` and never a guess.

## Connectors, always visible

The strip at the top is not decoration: not knowing *which* provider is missing
is the commonest confusion. Set `connected` honestly for both, and name what
each one powers — Composio for the platform APIs, Zernio for scheduling, queue
slots, comment-to-DM, cross-post and measured analytics. A platform with
`connected: false` renders as unavailable rather than empty.

**Never put an API key in the page.** Artifacts are shareable HTML; the studio
shows connection *state*, never a credential.

### Connectors have three states, not two

`connected` is `true`, `false`, or **`null` / omitted meaning "not checked this
refresh"**. Setting `false` for a provider you simply did not query prints
"Not connected — its features are unavailable" over a working connector, and
sends the user off reconnecting something that was never broken.

- Queried it and it answered → `connected: true`
- Queried it and it is genuinely not connected → `connected: false`
- **Did not query it this turn → `connected: null`** (renders "◌ Not checked
  this refresh")

`detail` carries the sub-state, because a provider can be connected while the
account behind it is not: `detail: "Instagram toolkit has no authorized
account — comments, DMs and insights cannot be read."` That is a different
problem from the connector being down, and the user fixes it differently.

## What the page may and may not do

The studio is a **snapshot with a live interface**: tabs, per-platform limits,
character counters with Instagram's 125-character fold, editable reply drafts,
relative times in the viewer's timezone. All of that runs locally.

It does **not** call anything. Its action is "Copy for Claude" — text comes back
to you and you perform it. Never label a control "Publish", and never let the
page imply something reached a platform.

## The standalone live studio

[`content-studio-live.html`](content-studio-live.html) beside this file is the
**always-on** variant: it has no baked-in `DATA` and calls the Content Studio
MCP connector itself, on load and on every action. Published once, it works
without Claude — the user opens the artifact URL and it fetches live.

Publish it with the full tools manifest:

```
capabilities: { mcp: { servers: [{ server: "Content Studio", tools: [
  "status","list_queue","schedule_post","update_scheduled_post",
  "delete_scheduled_post","analytics","queue_slots","list_automations",
  "create_automation","set_automation_active","delete_automation","crosspost"
]}] } }
```

**`capabilities` is a full-set declaration.** Restating it with only a new tool
silently revokes the rest, and half the page stops working. Paste the whole list
plus the addition, every time. Omit `capabilities` entirely to carry the stored
grant forward unchanged.

Updating it: republish to the **same URL** (pass the artifact's `url`), and bump
the `BUILD` constant so the footer shows whether the new version actually
loaded — artifacts can serve from cache.

## Before reaching for Live mode: check the surface

**Measured on a real account (Sept 2026), not inferred from docs.** Publish
`standalone/artifact-probe.html` and read its verdict before assuming anything
below is available.

On a **chat-artifact** surface — which is what claude.ai and the desktop app
produced when tested — the page gets a flat `window.claude` exposing only
`complete`. There is:

- **no `claude.use()`**, so no capabilities at all — `mcp`, `sample`, `artifact`
  and the rest simply do not exist;
- **no network**, and not merely no cross-origin network: `fetch` to the page's
  own URL is blocked too.

So on that surface a page **cannot reach any backend by any route**. Live mode,
the `mcp` capability and the Ask AI tab are all unavailable, and no publish-time
argument changes it. Snapshot is the only mode that works — which is fine,
because a snapshot needs no network: you fetch the data and bake it in.

Do not spend turns trying to publish a live page on a surface whose probe says
"no route out". Point the user at the deployed web app for live actions instead.

## Turning on live actions

The page can call the viewer's connectors itself, so a button queues a post or
sends a reply without another chat turn. Two things must both be true:

1. **You have observed the tool's real request and response in this session.**
   The runtime contract carries the call envelope, never a tool's argument names
   or result encoding. A guessed shape fails at the user's click — the worst
   place to discover it. If you have not made the call yourself, leave the page
   in snapshot and say so in your reply, not in the page.
2. **You fill `LIVE` and declare the matching capability at publish time:**

```js
LIVE = {
  enabled: true,
  actions: {
    queue: {
      server: "composio",              // the <server> in mcp__<server>__<tool>
      tool:  "<observed tool name>",
      args:  ({ platform, text }) => ({ /* the shape you observed */ }),
    },
  },
}
```

```
capabilities: { mcp: { servers: [{ server: "composio", tools: ["<tool>"] }] } }
```

Keep the manifest minimal — it is a viewer-consented grant, and declaring `mcp`
bars public sharing of the page.

The page still renders and stays useful when the capability resolves `null`;
live controls simply do not appear. Errors branch on the error **code**, never
the message: `needs_reauth` says reconnect, `server_not_connected` says add the
connector, `rate_limited` says wait. `server_unavailable` and `upstream_error`
are **ambiguous for writes** — a rejection is not proof the tool did not run, so
never silently retry a publish; re-read the state first.

A live button publishes for real. Say so on the control, confirm before
anything irreversible, and never label a snapshot control the same way.

## The Ask AI tab — running the skill's behaviour in the page

**No capability invokes a Claude skill.** A skill loads into a chat turn, and a
page cannot start one. What the studio does instead is run the skill's
*behaviour*: `sample` gives the page Claude, and `sample`'s `tools` are page
functions that reach the same connectors through `mcp`.

```js
ASSIST = {
  enabled: true,
  rules: "<the platform's rules.md, inlined here>",
}
```

```
capabilities: { sample: {}, mcp: { servers: [...] } }
```

Claude-in-the-page has **no memory and no skill loaded**, so everything that must
govern it goes in `rules` — the same contract the chat-side skill follows, so
both surfaces behave identically. Without `mcp`, it can draft and reason but
must not claim it performed anything; the page tells it so explicitly.

The viewer pays for these calls and the first one asks consent, so it only fires
on a click, never on load. Errors branch on code: hide on `not_granted`, back off
on `rate_limited`, and never loop. `onText` delivers the whole answer so far —
assign it, never append.

## Publishing

Title stays **Content Studio**; keep the favicon it was created with. Pass a
`description` saying what this refresh contains. Do not rename it per platform —
one studio, one identity, updated in place.
