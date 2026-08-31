"use client";

import { useState } from "react";
import { Button, Card, ErrorNote, Field, Note, inputClass } from "../ui";

/**
 * X cannot use a Composio-managed app (removed February 2026), so connecting
 * takes three steps instead of one. This walks the user through them rather
 * than failing with code 4300.
 */
export function XSetup({
  step,
  defaultScopes,
  optionalScopes,
  onDone,
}: {
  step: "credentials" | "connect";
  defaultScopes?: string[];
  optionalScopes?: string[];
  onDone: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [scopes, setScopes] = useState((defaultScopes ?? []).join(", "));
  const [includeDm, setIncludeDm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function saveCredentials() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/x/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          clientSecret,
          bearerToken,
          scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else onDone();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    setStatus("Opening X authorization…");
    try {
      const res = await fetch("/api/x/setup", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.connected) return onDone();
      window.open(data.redirectUrl, "_blank", "noopener");
      setStatus("Waiting for you to authorize X…");
      const poll = setInterval(async () => {
        const s = await fetch("/api/x/setup").then((r) => r.json());
        if (s.connected) {
          clearInterval(poll);
          onDone();
        }
      }, 3000);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "connect") {
    return (
      <Card className="space-y-4">
        <div>
          <h2 className="font-medium">Step 2 · Authorize your X account</h2>
          <p className="mt-1 text-sm text-black/55">
            Your credentials are saved. Now connect the account itself.
          </p>
        </div>
        <Note>
          If you saved credentials before adding the App-Only Bearer Token, search
          and counts will fail even though posting works. Re-enter all three to
          be sure.
        </Note>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={connect} disabled={busy}>
            {busy ? "Working…" : "Connect X account"}
          </Button>
          <button
            onClick={async () => {
              setBusy(true);
              await fetch("/api/x/setup", { method: "DELETE" });
              setBusy(false);
              onDone();
            }}
            className="text-sm text-black/50 underline"
          >
            Use different credentials
          </button>
        </div>
        {status && <p className="text-sm text-black/55">{status}</p>}
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-medium">Step 1 · Bring your own X credentials</h2>
        <p className="mt-1 text-sm text-black/55">
          Unlike Instagram, X has no shared app to borrow — managed Twitter
          credentials were withdrawn in February 2026. You need your own
          developer app.
        </p>
      </div>

      <Note>
        In the{" "}
        <a
          className="underline"
          href="https://developer.x.com/en/portal/dashboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          X developer portal
        </a>
        , from one app inside a Project you need <strong>three</strong> values:
        the OAuth 2.0 <strong>Client ID</strong> and <strong>Client Secret</strong>{" "}
        (User authentication settings &rarr; type &ldquo;Web App, Automated App
        or Bot&rdquo;), plus the <strong>App-Only Bearer Token</strong> from the
        Keys &amp; Tokens tab. The bearer token is required for app-only
        endpoints such as search and counts, which user tokens cannot reach.
      </Note>

      <Field label="Client ID">
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Client secret" hint="Stored securely, never in this repo.">
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="App-Only Bearer Token"
        hint="Keys & Tokens tab -> App-Only Authentication -> Bearer Token -> Generate. Must be the same app as the Client ID above."
      >
        <input
          type="password"
          value={bearerToken}
          onChange={(e) => setBearerToken(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Scopes"
        hint="X refuses the whole authorization if your app lacks any scope listed here. Keep offline.access so the token refreshes."
      >
        <textarea
          rows={3}
          value={scopes}
          onChange={(e) => setScopes(e.target.value)}
          className={inputClass}
        />
      </Field>

      {optionalScopes?.length ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDm}
            className="mt-0.5"
            onChange={(e) => {
              setIncludeDm(e.target.checked);
              const base = (defaultScopes ?? []).join(", ");
              setScopes(
                e.target.checked ? `${base}, ${optionalScopes.join(", ")}` : base,
              );
            }}
          />
          <span>
            Also request DM and Spaces access
            <span className="block text-xs text-black/50">
              Only tick this if your app&apos;s permission level is
              &ldquo;Read and write and Direct message&rdquo;. Otherwise X
              rejects the authorization with &ldquo;You weren&apos;t able to give
              access to the App&rdquo;.
            </span>
          </span>
        </label>
      ) : null}

      <ErrorNote>{error}</ErrorNote>
      <Button
        onClick={saveCredentials}
        disabled={
          busy || !clientId.trim() || !clientSecret.trim() || !bearerToken.trim()
        }
      >
        {busy ? "Saving…" : "Save credentials"}
      </Button>
    </Card>
  );
}
