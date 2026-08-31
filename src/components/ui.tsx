export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/10 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-black/50">{label}</div>
    </div>
  );
}

/** Composio's execution message explains most empty results — never hide it. */
export function Note({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      {children}
    </p>
  );
}

export function ErrorNote({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
      {children}
    </p>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-black/50">{hint}</p>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-8 text-sm text-black/45">{label}</p>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-ink",
    ghost:
      "border border-black/15 text-black hover:border-brand/50 hover:bg-brand/[0.04]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-black/45">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black outline-none placeholder:text-black/35 focus:border-brand/60";

/** Panel section heading with the brand rule, matching the landing page. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-sm font-medium tracking-wide text-black/45 uppercase">
      <span className="h-3 w-1 rounded-full bg-brand" />
      {children}
    </h3>
  );
}

/** Shared tab bar so both platform panels look and behave the same. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-black/8 bg-white p-1 shadow-sm">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
            active === t.id
              ? "bg-brand text-white"
              : "text-black/60 hover:bg-brand/[0.06] hover:text-brand-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
