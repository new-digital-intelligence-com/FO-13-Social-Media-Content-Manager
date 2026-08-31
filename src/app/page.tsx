import Image from "next/image";
import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { HomeStatus } from "@/components/HomeStatus";

type Platform = {
  id: string;
  name: string;
  href?: string;
  tint: string;
  blurb: string;
  capabilities: string[];
};

const LIVE: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    href: "/instagram",
    tint: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    blurb: "Posts, reels, stories, DMs, insights",
    capabilities: ["Compose", "Queue", "Monitor", "Insights"],
  },
  {
    id: "x",
    name: "X",
    href: "/x",
    tint: "from-neutral-700 to-black",
    blurb: "Posts, threads, search, lists, DMs",
    capabilities: ["Threads", "Search", "Lists", "Messages"],
  },
  {
    id: "youtube",
    name: "YouTube",
    href: "/youtube",
    tint: "from-[#FF0000] to-[#CC0000]",
    blurb: "Uploads, transcripts, comments, playlists",
    capabilities: ["AI Studio", "Upload", "Comments", "Playlists"],
  },
];

const PLANNED: Platform[] = [
  { id: "tiktok", name: "TikTok", tint: "", blurb: "Short video", capabilities: [] },
  { id: "linkedin", name: "LinkedIn", tint: "", blurb: "Professional posts", capabilities: [] },
  { id: "facebook", name: "Facebook", tint: "", blurb: "Pages & groups", capabilities: [] },
  { id: "threads", name: "Threads", tint: "", blurb: "Text posts", capabilities: [] },
  { id: "pinterest", name: "Pinterest", tint: "", blurb: "Pins & boards", capabilities: [] },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Brand wash in NDI red, kept faint so the accent stays a highlight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-52 h-[460px] bg-[radial-gradient(55%_60%_at_50%_50%,rgba(254,1,0,0.10),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-14">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* The logo PNG has a white background; multiply drops it cleanly. */}
            <Image
              src="/logo.png"
              alt="NDI — New Digital Intelligence"
              width={301}
              height={168}
              priority
              className="h-12 w-auto mix-blend-multiply"
            />
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60">
              <span className="size-1.5 rounded-full bg-brand" />
              3 platforms connected
            </span>
          </div>

          <div className="mt-9 max-w-2xl border-l-4 border-brand pl-5">
            <p className="font-mono text-xs font-medium tracking-[0.2em] text-brand-ink uppercase">
              FO-13
            </p>
            <h1 className="mt-1.5 text-4xl font-semibold tracking-tight sm:text-[2.75rem] sm:leading-[1.1]">
              Social Media
              <br />
              Content Manager
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-black/55">
              Run your accounts by hand or hand them to the AI. Every post waits
              for your approval before it publishes.
            </p>
          </div>
        </header>

        <HomeStatus />

        <section className="mt-14">
          <SectionTitle>Your platforms</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LIVE.map((platform) => (
              <Link
                key={platform.id}
                href={platform.href!}
                className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
              >
                {/* Red hairline that fills in on hover. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100"
                />
                <div
                  aria-hidden
                  className={`absolute -right-16 -top-16 size-40 rounded-full bg-gradient-to-br ${platform.tint} opacity-[0.07] transition group-hover:opacity-[0.13]`}
                />
                <div className="relative">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${platform.tint} text-white shadow-sm`}
                  >
                    <BrandIcon id={platform.id} className="size-6" />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">{platform.name}</h3>
                  <p className="mt-1 text-sm text-black/50">{platform.blurb}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {platform.capabilities.map((c) => (
                      <span
                        key={c}
                        className="rounded-md bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-black/60"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition group-hover:text-brand-ink">
                    Open panel
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionTitle>Not wired up yet</SectionTitle>
          <p className="mt-1 text-sm text-black/45">
            Supported by the integration layer; nothing in this app talks to
            them yet.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PLANNED.map((platform) => (
              <div
                key={platform.id}
                className="rounded-xl border border-dashed border-black/12 bg-white/50 p-4 text-center"
              >
                <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-black/[0.06] text-black/35">
                  <BrandIcon id={platform.id} className="size-4" />
                </div>
                <p className="mt-2 text-sm font-medium text-black/55">
                  {platform.name}
                </p>
                <p className="mt-0.5 text-[11px] text-black/35">{platform.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6 text-sm text-black/45">
          <p>
            Also available as Claude Code plugins —{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-xs">
              /instagram
            </code>{" "}
            and{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-xs">/x</code>{" "}
            share the same rules this app follows.
          </p>
          <p className="font-mono text-xs tracking-wider text-black/35">
            NEW DIGITAL INTELLIGENCE
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-medium tracking-wide text-black/45 uppercase">
      <span className="h-3 w-1 rounded-full bg-brand" />
      {children}
    </h2>
  );
}
