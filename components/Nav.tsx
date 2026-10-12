import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const LINKS = [
  { href: "/", key: "radar", label: "Radar" },
  { href: "/hot-list", key: "hotlist", label: "Hot List" },
  { href: "/how-it-works", key: "how", label: "How it works" },
] as const;

export function Nav({ active, signedIn }: { active: (typeof LINKS)[number]["key"] | "account"; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-full border border-hot/40 bg-hot/10">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-hot/60" />
            <span className="h-2 w-2 rounded-full bg-hot shadow-[0_0_10px_#ff5a36]" />
          </span>
          <span className="font-serif text-[22px] leading-none tracking-tight text-text">
            Signal<span className="italic text-hot">/</span>Monitor
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-[13px] transition ${
                active === l.key ? "bg-white/[0.06] text-text" : "text-mute hover:text-text"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[12px]">
          {signedIn ? (
            <>
              <span className="hidden items-center gap-1.5 text-mute sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-good" /> Signed in as Arjun
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="rounded-md border border-line-2 px-3 py-1.5 text-mute transition hover:border-hot/50 hover:text-text">
              Sign in to run scans
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {LINKS.map((l) => (
          <Link key={l.key} href={l.href} className={`shrink-0 rounded-md px-3 py-1 text-[12px] ${active === l.key ? "bg-white/[0.06] text-text" : "text-mute"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
