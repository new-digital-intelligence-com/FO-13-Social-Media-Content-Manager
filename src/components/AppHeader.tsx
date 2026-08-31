import Image from "next/image";
import Link from "next/link";

/** Brand header shared by the platform panels. */
export function AppHeader({
  title,
  icon,
  right,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="NDI — New Digital Intelligence"
            width={301}
            height={168}
            priority
            className="h-7 w-auto mix-blend-multiply"
          />
          <span className="hidden font-mono text-[11px] tracking-[0.18em] text-black/35 uppercase sm:inline">
            FO-13
          </span>
        </Link>
        {right}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="text-sm text-black/45 transition hover:text-brand-ink"
          >
            ← All platforms
          </Link>
          <h1 className="mt-1 flex items-center gap-2.5 border-l-4 border-brand pl-3 text-2xl font-semibold tracking-tight">
            {icon}
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
