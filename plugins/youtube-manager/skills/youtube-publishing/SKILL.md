---
name: youtube-publishing
description: Upload videos to YouTube and manage their metadata - titles, descriptions, tags, thumbnails, privacy and categories. Use when the user wants to upload, publish, schedule, retitle, rewrite a description, change a thumbnail, or delete a video. Also triggers on "edit thumbnail", "set thumbnail", "sync thumbnail", "add thumbnail" followed by an NDI AI employee code (GP-02, FO-13, DR-20), a YouTube link or video id, or a video title.
---

> **In the Claude app, render this into the Content Studio artifact.** There is
> one studio for the whole toolkit — find it and update the relevant section,
> never publish a second artifact. **An empty or unavailable result still goes in
> the studio**: "nothing scheduled" and "could not be read" are states it draws,
> not reasons to fall back to prose. Only in a terminal is a text answer right.
> See [../youtube/references/artifact.md](../youtube/references/artifact.md).

> **Never ask an open question in prose.** The moment you would write a
> sentence ending in "?" with options inside it, stop and ask with the
> **tappable question tool** instead, so the user clicks rather than reads and
> retypes. Its name differs by surface — **`ask_user_input_v0`** in the Claude
> app, **`AskUserQuestion`** in Claude Code — so use whichever one is in your
> toolset.
>
> This binds on the very first turn: invoked bare with no request, do **not**
> write "what would you like to do?" — read the current state first (connectors,
> what exists, what is live), show it, then offer the next step as options, one
> per real path.
>
> Each option names its consequence — "Publish now · visible immediately, no
> undo" beats "yes" — and the one you would recommend goes first, with the
> reason. Anything irreversible is confirmed this way, never assumed.
>
> **One question at a time — never a checklist.** When several things are still
> missing, do not list them and wait for the user to answer all four in one
> message. Ask the first, take the answer, ask the next. A numbered list of
> fields is the prose failure wearing a different hat.
>
> **If the answer is one of things you can look up, look them up first.** Never
> ask the user to paste an id, a link, or "tell me which one" for something you
> can fetch: list the account's recent posts, its reels, its playlists, its
> automations — whatever the question is about — and offer those as the options,
> each labelled so it is recognisable (the caption's first words and the date,
> not a bare id). Making the user go and find an id you could have fetched is
> the worst version of this failure, because they have to leave the conversation
> to answer you.
>
> **"It's free text, so the tool doesn't fit" is not a reason to drop the form
> either.** For a genuinely open field — a keyword, a DM body, a name — draft
> two or three concrete candidates and offer those; the tool's own custom-answer
> path covers anything else. A blank ask makes the user do work you could have
> done.
>
> Ask in words only when you have nothing to propose and no options exist, and
> then for one thing at a time. If no such tool exists at all, use a **numbered
> list**, one option per line.

# YouTube publishing

## Confirm before every write, and default to private

An upload can notify subscribers and cannot be un-notified. **Upload as
`private` unless the user explicitly asks to publish**, then let them review
and flip it. Show the exact title, description and privacy before uploading.

Deleting a video is **permanent** and takes its views, comments and inbound
links with it. Never delete on a vague instruction.

## Uploading — use the multipart tool

**Use `YOUTUBE_MULTIPART_UPLOAD_VIDEO`, not `YOUTUBE_UPLOAD_VIDEO`.**

`YOUTUBE_UPLOAD_VIDEO` returns success and creates the video on the channel,
but the file YouTube receives is unusable: every upload ends as *"processing
abandoned"* in Studio. This was verified against a known-good video that the
multipart tool then published from the identical staged file. The failure is
invisible from the API — a failed video never enters the uploads playlist, so
listing the channel shows nothing at all.

Note the differences between the two tools:

| | `MULTIPART_UPLOAD_VIDEO` (use this) | `UPLOAD_VIDEO` (broken) |
|---|---|---|
| File argument | `videoFile` | `videoFilePath` |
| Response shape | `{ video: { id } }` | `{ id }` under `response_data` |

Stage the file with the same tool slug you are going to call; the storage key
is scoped per tool.

Required: `title`, `description`, `categoryId`, `privacyStatus`, `videoFile`.
An empty tag list is rejected. Uploads cost ~1600 quota units, so a failed one
is expensive — validate before sending.

**Do not ask the user for a category.** The API requires the field but
youtube.com never asks for it at upload time, so default to `22`
(People & Blogs) and move on. It is editable afterwards with
`YOUTUBE_UPDATE_VIDEO`. Only ask if the user raises it themselves, or set it
knowingly when the fit is obvious (`10` Music, `20` Gaming, `27` Education,
`28` Science & Tech). `YOUTUBE_LIST_VIDEO_CATEGORIES` has the region-specific
list. The app's upload panel omits the field for this reason.

## Shorts

There is no Shorts flag anywhere in the toolkit. YouTube classifies a video as
a Short from the file itself: roughly **3 minutes or under** and **taller than
it is wide**. A qualifying upload lands under Shorts in Studio, not Videos —
which looks like a failed upload if you are not expecting it.

So do not promise a Short, describe what the file will produce. Check the
duration and dimensions before uploading and say which it will be. Appending
`#Shorts` to the description is a hint only; it does not override the file.
The app's upload panel mirrors this: an intent selector, the file's measured
verdict, and a warning when the two disagree.

## Metadata that actually matters

- **Title** — under 60 characters stays readable in search and suggested.
  Specific beats clever. Never fabricate numbers or claims to bait clicks.
- **Description** — the first two lines show above the fold; put the substance
  there. Max 5,000 characters.
- **Chapters** live in the description as `M:SS Title` lines, first one `0:00`,
  minimum three, in ascending order. YouTube ignores malformed lists silently.
- **Tags** — 10-15, mixing broad and specific. Low impact these days; do not
  stuff.

**Write metadata from the transcript, not the filename.** See
[youtube-content](../youtube-content/SKILL.md).

## Editing published videos

`YOUTUBE_UPDATE_VIDEO` (`video_id`) changes title, description, tags, privacy
or category. Warn the user before rewriting the title or description of a video
that is performing — it can disturb its search and suggested placement.

## Thumbnails

`YOUTUBE_UPDATE_THUMBNAIL` takes `videoId` and `thumbnailUrl`. It changes
nothing else — not the title, description, tags, privacy or the video file.
It cannot delete anything. Say so plainly when a user asks what it touches.

Requires a verified channel. On an unverified one it fails with a permissions
error that reads like a scope problem but is not.

### Preflight — two connections, not one

This procedure needs **two** Composio account connections, not just YouTube:

- **youtube** — the channel itself. If missing, see
  [youtube-setup](../youtube-setup/SKILL.md).
- **googledrive — the Composio toolkit specifically.** Required to read the
  master artwork. Nothing else in this toolkit needs it, so it is routinely
  absent even when YouTube works fine.

**A native Claude Google Drive connector is not a substitute.** This is the
trap: Drive looks connected, matching works, and the run stalls at the push.
Only Composio's `GOOGLEDRIVE_DOWNLOAD_FILE` returns an `s3url` — a signed,
publicly-fetchable link that YouTube can pull from. The Claude connector's
`download_file_content` returns base64 into the conversation: no URL for
YouTube to fetch, and ~2 MB of text per image, which is unusable across a
batch. Its `share_file` does not close the gap either — it shares with named
email addresses, not "anyone with link".

Both can coexist, and the Claude connector is the better tool for *finding*
things: richer search syntax, and it reads Google Sheets natively (useful for
the catalog cross-check below). Use it to browse; use Composio to fetch.

- **cloudinary — recommended, not required.** Only used to shrink masters over
  YouTube's 2 MB cap. Rare (1 file in 72 on the NDI channel) but it *will*
  recur, so raise it once at preflight rather than mid-batch: if it is missing,
  say in one line that oversized files will be skipped without it, offer the
  connection, and **carry on either way**. Never block a sync on it.

Check these before starting, with `COMPOSIO_MANAGE_CONNECTIONS`
(`action: "list"`). Connect what is missing and wait for ACTIVE before the
first push. Two notes on that tool: `action: "list"` on an unconnected toolkit
creates an empty pending stub as a side effect, and auth links expire in ten
minutes — generate a fresh one rather than resending an old one.

Do not begin pushing until both report ACTIVE. A half-connected run fails
partway and leaves the batch in an unclear state.

### Syncing a thumbnail from the NDI Drive library

Triggered by "edit thumbnail GP-02", a YouTube link, a video id, or a title.

Master artwork lives in Drive folder `1N4byBTVARlI4CJEF-Ys-Rf7qPQK7y5xe`,
split into eight category subfolders (DO, DR, FO, GP, KT, PA, SD, UO). Files
are named `NDI_<CODE>_<Name>_Thumbnail.png`. One thumbnail per AI employee.

**1. Resolve the video.** Match on the `[XX-NN]` code in the video title, not
on fuzzy text — titles are coded, so matching is exact. Normalise first:
`[DO 07]`, `[DO -04]`, `[UO-4]` and `DO 24 ...` all appear. Use
`\[?\b([A-Z]{2})\s*-?\s*(\d{1,2})\b\]?` and zero-pad the number.

**2. Get a public URL.** YouTube only accepts a publicly reachable image URL —
there is no file-upload path. Call `GOOGLEDRIVE_DOWNLOAD_FILE` with the Drive
file id and use `data.downloaded_file_content.s3url`. That URL is public and
valid for one hour, so nothing in the user's Drive is shared or made public.
Never make Drive files public to solve this, and never base64 a 1.5 MB PNG
through the conversation.

**3. Push, then verify.** Details below.

### Hard limits, learned the hard way

**2 MB cap.** YouTube rejects anything larger outright, with a clear error.
Some NDI masters exceed it (DO-01 is 2.34 MB).

With Cloudinary connected: upload the s3url with
`transformation: "w_1280,h_720,c_fill,q_auto:good,f_jpg"` and push the
resulting `secure_url`. That took DO-01 from 2.34 MB to 190 KB at 1280x720.

Without it: **skip that file and say so.** Do not resize into the user's Drive
folder to work around it — writing derived files beside their masters is a
side effect they did not ask for.

Either way, the compression is a patch, not a fix: the Drive master is still
oversized and will fail on every future sync. Always name the file and say it
needs re-exporting at source.

**Rate limit.** The endpoint throttles hard per channel. Sequential with a
~7-8 second gap is safe. Running it 8-wide in parallel triggers a 429 that
locks the whole channel out for roughly an hour, and the API keeps returning
429 even for single requests during that window. Never parallelise this.
On a 429, stop and wait — do not retry in a loop.

**Quota.** Uploads cost ~1,600 units against a 10,000/day default (~6 uploads
a day). Thumbnail sets are far cheaper but not free.

### Verifying — do not trust the API response

A `thumbnailSetResponse` proves the request was accepted, not that the image
changed. Checking that `maxres` exists proves nothing either: YouTube
auto-generates a 1280x720 frame for every HD upload, so that check passes on
videos that have no custom thumbnail at all.

Verify by comparing the served image against the Drive source. Fetch
`https://i.ytimg.com/vi/<videoId>/mqdefault.jpg`, compute a perceptual hash of
both (16x16 greyscale, threshold at the mean, Hamming distance), and compare.
A genuine match scores 0-6. Two *different* NDI thumbnails score ~40, because
they share a template — so a distance near 40 means the wrong image, not a
near miss.

Allow ~20 seconds after the push before comparing. If it still differs two
hours later, it is not CDN caching: report it as stuck and send the user to
Studio rather than pushing a third time. FO-13 behaves this way — the API
returns success and the served bytes never change.

### When to stop and ask

**Two videos, one code.** DO-07, FO-13 and GP-05 each have a main video plus a
demo or re-upload. There is only one master per employee, so push the same
thumbnail to both. Not an error.

**Code and title disagree.** If the `[XX-NN]` code points at one employee and
the title names another, do not guess — the wrong artwork is worse than none.
Check the video description first, which often settles it, then ask. Live
examples: `[UO-15] VC Funding Finder` (UO-15 is Investment Target Scout; VC
Funding is UO-14) and `[UO-4] Recruiter Assistant Demo English` (UO-04 is
Executive Recruiter; plain Recruiter is UO-03).

**No code in the title.** Intro videos, podcasts, event talks and the named
agent demos have no code and no thumbnail. Skip them silently.

### Catalog cross-check

The authoritative employee list is the Drive sheet **NDI AI Employee
Architecture Details** (`1V2leyAdTrtIirMeXssLdbZEdGEkHZEOBd4dp_EwmjlI`): 123
IDs with name, priority and maturity. Use it to confirm a code maps to the
employee the user means, and to answer coverage questions. Note GP-13 does
not exist — the gap is intentional.

## Scheduling

The Data API has no scheduling in this toolkit. "Schedule this for Friday"
means uploading as `private` now and flipping to `public` later from the
caller's own job store. Say so rather than implying it is queued.
