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
  connectors: [{ name, does, connected }],          // Composio, Zernio
  platforms:  [{ id, label, handle, connected }],   // instagram | x | youtube
  alerts:     [{ level: "warn"|"error", text }],    // studio-wide problems
  data: {
    instagram: {
      stats:       [{ label, value }],       // value null renders "—", never 0
      window:      "last 30 days",
      statsNote:   "why something is missing",
      queue:       { available: true, posts: [{ caption, publishAt, status }] },
      draft:       { text },
      bestTime:    [{ label: "Tue 19:00", value, post_count }],
      engage:      [{ from, text, reply, tag, tone }],
      automations: [{ name, keywords, scope, active, stats }],
      monitor:     [{ text, when }],
    },
    x: { ... }, youtube: { ... },
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

## What the page may and may not do

The studio is a **snapshot with a live interface**: tabs, per-platform limits,
character counters with Instagram's 125-character fold, editable reply drafts,
relative times in the viewer's timezone. All of that runs locally.

It does **not** call anything. Its action is "Copy for Claude" — text comes back
to you and you perform it. Never label a control "Publish", and never let the
page imply something reached a platform.

Giving it live connector access is possible via the `mcp` capability, but only
for tools whose real request and response you have observed in this session. The
runtime contract carries the call envelope, never a tool's argument names or
result encoding — so without that observation, stay with the snapshot and say so
in your reply rather than in the page.

## Publishing

Title stays **Content Studio**; keep the favicon it was created with. Pass a
`description` saying what this refresh contains. Do not rename it per platform —
one studio, one identity, updated in place.
