"use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  alias: string | null;
  status: string;
  label: string;
  active: boolean;
};

/**
 * Switch between several connected accounts on one platform, and add more.
 *
 * Only renders once an account exists, so a first-time connect flow is
 * unchanged. Everything the app executes goes through the account marked
 * active here.
 */
export function AccountSwitcher({
  platform,
  onSwitch,
}: {
  platform: "instagram" | "x" | "youtube";
  onSwitch?: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/accounts?platform=${platform}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setAccounts(d.accounts ?? []);
      })
      .catch(() => !cancelled && setAccounts([]));
    return () => {
      cancelled = true;
    };
  }, [platform]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, ...body }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setAccounts(data.accounts);
    setBusy(false);
    onSwitch?.();
  }

  async function addAccount() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) return setError(data.error);
    if (data.redirectUrl) {
      window.open(data.redirectUrl, "_blank", "noopener");
      // The new account only appears once the OAuth window completes.
      const poll = setInterval(async () => {
        const r = await fetch(`/api/accounts?platform=${platform}`).then((x) => x.json());
        if ((r.accounts?.length ?? 0) > (accounts?.length ?? 0)) {
          setAccounts(r.accounts);
          clearInterval(poll);
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 180000);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(
      `/api/accounts?platform=${platform}&accountId=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    if (data.error) setError(data.error);
    else setAccounts(data.accounts);
    setBusy(false);
    onSwitch?.();
  }

  if (!accounts || accounts.length === 0) return null;

  const active = accounts.find((a) => a.active) ?? accounts[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-black/12 bg-white px-3 py-1.5 text-sm transition hover:border-black/25"
      >
        <span className="max-w-[10rem] truncate font-medium">{active.label}</span>
        {accounts.length > 1 && (
          <span className="rounded-full bg-black/[0.06] px-1.5 text-[11px] text-black/55">
            {accounts.length}
          </span>
        )}
        <span className="text-black/40">▾</span>
      </button>

      {open && (
        <>
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
            <p className="px-2 py-1.5 text-xs font-medium tracking-wide text-black/40 uppercase">
              Connected accounts
            </p>

            {accounts.map((a) => (
              <div key={a.id} className="rounded-lg px-2 py-1.5 hover:bg-black/[0.03]">
                {renaming === a.id ? (
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          patch({ accountId: a.id, label: draftLabel });
                          setRenaming(null);
                        }
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="min-w-0 flex-1 rounded-md border border-black/15 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        patch({ accountId: a.id, label: draftLabel });
                        setRenaming(null);
                      }}
                      className="text-xs text-brand-ink underline"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !a.active && patch({ accountId: a.id })}
                      disabled={busy}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          a.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {a.label}
                        {a.status !== "ACTIVE" && (
                          <span className="ml-1.5 text-xs text-amber-700">
                            {a.status.toLowerCase()}
                          </span>
                        )}
                      </span>
                      {a.active && (
                        <span className="shrink-0 text-xs font-medium text-brand-ink">
                          active
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setRenaming(a.id);
                        setDraftLabel(a.label);
                      }}
                      className="shrink-0 text-xs text-black/40 hover:text-black/70"
                    >
                      rename
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      disabled={busy}
                      className="shrink-0 text-xs text-black/40 hover:text-red-600"
                    >
                      remove
                    </button>
                  </div>
                )}
              </div>
            ))}

            {error && (
              <p className="mt-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">
                {error}
              </p>
            )}

            <button
              onClick={addAccount}
              disabled={busy || accounts.length >= 5}
              className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-brand-ink hover:bg-brand/[0.05] disabled:opacity-40"
            >
              + Connect another account
            </button>
            {accounts.length >= 5 && (
              <p className="px-2 pb-1 text-xs text-black/45">
                Limit of 5 per platform.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
