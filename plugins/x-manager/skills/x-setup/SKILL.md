---
name: x-setup
description: Connect an X (Twitter) account to Composio and diagnose X auth problems. Use when the user needs to link X, hits a 403 or client-not-enrolled error, sees UsageCapExceeded, or asks why Twitter will not connect.
---

# X setup

X is the awkward one. **Composio removed its managed Twitter credentials in
February 2026**, so unlike most toolkits there is no shared app to fall back on.

## App setup details that bite later

In *User authentication settings*:

- **Type of App must be "Web App, Automated App or Bot" (confidential client).**
  "Native App" is a public client and issues **no client secret**, so the auth
  config cannot be created at all.
- **App permissions must be set before generating credentials.** Choosing "Read"
  and expecting to post later fails; changing it afterwards requires
  regenerating the keys and reconnecting.
- **Callback URL:** `https://backend.composio.dev/api/v1/auth-apps/add`
- **Website URL must be https**, so `localhost` is rejected there.

## What must exist, in order

1. **Composio tools reachable in this client** — the `composio` MCP server
   (this plugin ships `.mcp.json`) or the Composio CLI.
2. **An X developer app.** The user creates it at
   <https://developer.x.com/en/portal/dashboard>. It must be **attached to a
   Project**, with OAuth 2.0 enabled and a callback URL configured.
3. **A Composio auth config** built from **three** values from that one app —
   see below. Two is the usual mistake.
4. **A connected account** — the OAuth handshake for the acting user.

Skipping step 3 fails at session creation, not at the tool call:

```
The following toolkits require auth configs but none exist and cannot be
auto-created: twitter. Please specify them in auth_configs.   (code 4300)
```

Treat that error as "setup incomplete", never as a broken integration.

## X needs three credentials, not two

Composio's `TWITTER` OAUTH2 scheme requires:

| Credential key | X portal name | Where |
|---|---|---|
| `client_id` | OAuth 2.0 Client ID | Keys & Tokens → OAuth 2.0 Keys, after completing *User authentication settings* |
| `client_secret` | OAuth 2.0 Client Secret | same place, shown once |
| `generic_id` | **Application Bearer Token** | Keys & Tokens → App-Only Authentication → Bearer Token → Generate |

`generic_id` is the confusing one: the key name says nothing, but it is the
**app-only bearer token**. Omitting it fails auth-config creation with:

```
Missing required field "Application Bearer Token" ... Required for app-only
endpoints: TWITTER_RECENT_SEARCH, TWITTER_RECENT_SEARCH_COUNTS,
TWITTER_FULL_ARCHIVE_SEARCH_COUNTS, TWITTER_POSTS_LABEL_STREAM,
TWITTER_CREATE_COMPLIANCE_JOB_REQUEST, ...          (code 301)
```

X has two auth modes: the OAuth pair acts **as the user** (post, like, DM),
while search, counts, label stream and compliance jobs are **app-only** and a
user token cannot reach them. That is why both are required.

All three must come from the **same app**. Mixing apps produces confusing
failures at call time rather than at setup.

If unsure what a toolkit requires, read it rather than guessing:

```typescript
const tk = await composio.toolkits.get("twitter");
// authConfigDetails[].fields.authConfigCreation.{required,optional}
```

## Creating the auth config

Use the user's own credentials with a custom auth config, and enable it for the
tool router or sessions will not see it:

```typescript
await composio.authConfigs.create("twitter", {
  type: "use_custom_auth",
  name: "x-app",
  authScheme: "OAUTH2",
  credentials: {
    client_id: "...",
    client_secret: "...",
    generic_id: "...", // App-Only Bearer Token
    scopes: "tweet.read,tweet.write,users.read,offline.access",
  },
  isEnabledForToolRouter: true,
});
```

`scopes` travels as a comma-separated **string**; the credentials map takes
scalars, not arrays.

Then create the session pinned to it, and authorize:

```typescript
const session = await composio.create(userId, {
  toolkits: ["twitter"],
  authConfigs: { twitter: authConfigId },
});
const request = await session.authorize("TWITTER");
```

Pick scopes to match what the user actually needs — `tweet.write` to post,
`like.write` to like, `dm.read`/`dm.write` for messages, `list.write` for lists,
and `offline.access` so the token refreshes.

## Diagnosing

Get the Composio `log_id` first, then:

- **code 4300 at session creation** — no auth config. Step 3 above.
- **code 301 / `Missing required field "Application Bearer Token"`** — the auth
  config was created without `generic_id`. Recreate it with all three values.
- **`client-not-enrolled` or `App not linked to project`** — the X app is not
  attached to a Project in the developer portal, or the OAuth config is stale
  after X's API changes. Fix the app; if the connection is already `EXPIRED`,
  recreate it.
- **403** — the developer plan does not include that endpoint. Check the access
  tier at <https://developer.x.com/en/portal/products>. This is not fixable in
  code.
- **`UsageCapExceeded` or 429** — per-app rate limit or the monthly post cap.
  Wait or upgrade the plan; do not retry in a loop.
- **Auth error after previously working** — token revoked or expired.
  Reconnect the account; keep the same auth config.

Never respond to a plan-tier or quota problem by rotating the Composio project
key: that is a different layer entirely.
