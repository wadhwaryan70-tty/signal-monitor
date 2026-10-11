"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
          if (res.ok) {
            router.push("/");
            router.refresh();
          } else {
            setErr((await res.json().catch(() => ({}))).error ?? "Sign-in failed");
            setBusy(false);
          }
        }}
        className="glass rise w-full max-w-sm rounded-2xl p-8"
      >
        <div className="font-serif text-[30px] leading-none text-text">
          Signal<span className="italic text-hot">/</span>Monitor
        </div>
        <p className="mt-2 text-[13px] text-mute">Sign in as Arjun to run scans, send the Hot List and edit your notes. Viewing is open.</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-line-2 bg-black/30 px-3 py-2.5 text-sm text-text outline-none transition focus:border-hot/60"
        />
        {err && <div className="mt-2 text-[12px] text-hot">{err}</div>}
        <button disabled={busy || !pw} className="mt-4 w-full rounded-lg bg-hot py-2.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link href="/" className="mt-4 block text-center text-[12px] text-faint hover:text-mute">← Back to the radar</Link>
      </form>
    </main>
  );
}
