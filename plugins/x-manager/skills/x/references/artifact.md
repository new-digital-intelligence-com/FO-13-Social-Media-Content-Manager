# Rendering results as an Artifact

In the Claude app, a long answer about a queue, a report or a draft is worse
than the app's own screen: it cannot be scanned, filtered or edited. Publish an
**Artifact** instead, using the Content Studio's own visual language, so the
Claude app and the web app look and behave like one product.

Do this in the Claude app and on claude.ai. In a terminal (Claude Code) there is
no artifact viewer — answer in text there.

## Two modes, and the difference matters

**Snapshot (default, always safe).** You fetch the data with your connectors,
then bake it into the page. The page is fully interactive — tabs, filters,
sorting, character counters, per-platform previews, draft editing — but it does
not call anything itself. Actions go back through you.

Declare **no** capabilities. This mode always works.

**Live (opt-in).** The page calls the connectors itself through the `mcp`
capability, so it refreshes without another turn.

**Precondition, no exceptions:** never publish a page that calls a connector
tool whose real request and response you have not observed in *this* session.
The type contract gives you the call envelope, never a tool's argument names or
result encoding. If you have not made that call yourself, use Snapshot mode and
say so in your reply — not in a note inside the page.

## Always lead with connector status

The commonest confusion is not knowing which provider is missing. Put this strip
at the top of every artifact:

| Provider | Powers | Shown as |
|---|---|---|
| Composio | X API calls — posts, threads, engagement, search, lists, DMs | ● Connected / ○ Not connected |

X is **not** connected on Zernio, so there is no queue for it: say "scheduling is
not available for X" rather than rendering an empty queue.

Rules that keep it honest:

- Name what each provider **does**, not just that it exists. "Zernio — scheduling
  and analytics" tells someone why a missing tick matters.
- A missing connector disables its section with a reason, and never silently
  empties it. "Not connected" and "nothing scheduled" must never look alike.
- In Live mode, `listTools()` reports which connectors the viewer actually has —
  use it rather than assuming, and gate each section on its own server.
- **Never put an API key in the page.** Artifacts are shareable HTML. Composio
  and Zernio credentials stay server-side; the page shows connection *state*,
  never a token.

## Start from the template

[`artifact-template.html`](artifact-template.html) beside this file is a working
page carrying every token, component and state described below — connector
strip, queue groups, stat row, best-time list, composer with a live counter,
automation cards, and the degraded states. **Read it and adapt it** rather than
rebuilding the design each time; that is what keeps successive artifacts
consistent with each other and with the web app.

It is a template, not a published page. Its content is illustrative — replace
every value with real data before publishing, and never ship its placeholder
text as if it were the user's.

## The visual language

Match `src/app/globals.css` and `src/components/ui.tsx` exactly — the point is
that the two surfaces look like one product.

```
Brand      #fe0100   NDI red, used sparingly and at full strength
Brand ink  #c40100   hover/pressed
Ground     #f7f7f8   page background
Surface    #ffffff   cards
Ink        #101014   text
Muted      rgba(0,0,0,.55) secondary · rgba(0,0,0,.45) tertiary
Hairline   rgba(0,0,0,.10) borders
```

Semantic colour is separate from the accent and never borrows the brand red:
emerald for published/live, amber for warnings and degraded providers, red for
failures and irreversible confirmations.

Typography is Geist and Geist Mono (both on Google Fonts), with a real fallback
stack. Use `tabular-nums` wherever digits line up.

Components, straight from the app:

- **Card** — `border-radius: 16px`, 1px hairline border, white surface, 20px pad
- **Button** — `border-radius: 12px`, 8/16px pad; primary is brand red on white
  text, ghost is a hairline border
- **Pill** — fully rounded, 11px, 1px ring; the state of a row at a glance
- **Note** — amber tint + amber ring, for a caveat that must not be hidden
- **ErrorNote** — red tint + red ring
- **Empty** — dashed border, a title and a hint saying what to do next

The app is light-only, but an artifact renders in the viewer's theme. Define the
full light palette on bare `:root`, then redefine **only the tokens** under both
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and
`:root[data-theme="dark"]`. Keep the brand red constant; lift the ground to
`#141416` and the surface to `#1c1c1f` rather than inverting. Always paint
`body` from a token — a transparent body borrows the host's ground.

## What to render for which request

| The user asked about | Build |
|---|---|
| A report, insights, best time | Stat row, then the detail. Convert best-time slots from UTC to the viewer's timezone, and show `post_count` per slot so thin data is visible as thin. |
| Drafting a caption or description | The composer: live character counter against the real platform limit (X 280, a hard limit — a thread part must each fit independently) and a per-platform preview. |
| Comments or DMs to answer | Triage list with the drafted reply editable inline, and the original visible beside it. |
| Monitoring a handle or keyword | Search results as a list. X has **no mentions endpoint** and recent search reaches only ~7 days — say both, so "no results" is not read as "no mentions". |

## Rules the page must not break

- **Never make a page look like it published something.** In Snapshot mode
  nothing the viewer clicks reaches a platform. Label the action for what it is
  — "Copy for Claude", "Send back to Claude" — never "Publish".
- **Show the timezone.** A schedule time with no timezone is a support ticket.
- **Distinguish "unavailable" from "empty"** in every section, always.
- **Never invent a number.** A metric that could not be fetched is shown as
  missing, not estimated or filled from another source.
- Wide tables get `overflow-x: auto` on their own container.
- Respect `prefers-reduced-motion`; give focus a visible state.

## Naming

`title` is a real product name, two to four words, specific to the page —
"Thread Composer", "Mention Watch", "List Curation". Not "Report" and not a
name with an explainer after a dash. The one-sentence `description` carries the
explanation; the gallery shows it under the title.

Pick a favicon on first publish and never change it. Redeploy to the **same file
path** to update in place rather than scattering near-duplicate artifacts.
