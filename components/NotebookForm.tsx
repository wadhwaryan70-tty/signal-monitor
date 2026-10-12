"use client";

// Arjun's notebook. Saves through update_arjun_fields(), which can only touch these three columns.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArjunTag } from "./ScoreRing";

export function NotebookForm({
  id,
  initial,
  signedIn,
}: {
  id: string;
  initial: { arjun_notes: string | null; last_contact_date: string | null; relationship_read: string | null };
  signedIn: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    arjun_notes: initial.arjun_notes ?? "",
    last_contact_date: initial.last_contact_date ?? "",
    relationship_read: initial.relationship_read ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const dirty =
    f.arjun_notes !== (initial.arjun_notes ?? "") ||
    f.last_contact_date !== (initial.last_contact_date ?? "") ||
    f.relationship_read !== (initial.relationship_read ?? "");

  async function save() {
    setState("saving");
    const res = await fetch(`/api/accounts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState(data.error ?? "Save failed");
    setState("saved");
    router.refresh();
  }

  const field = "hand w-full resize-none bg-transparent text-[21px] leading-[26px] text-paper-ink outline-none placeholder:text-paper-ink/30 disabled:cursor-not-allowed";
  return (
    <div className="paper relative rounded-2xl p-6 pl-12">
      <div className="absolute -top-3 left-10 h-6 w-20 rotate-[-3deg] bg-[#e9dcb4]/80 shadow-sm" aria-hidden />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-ink/60">Your notebook</span>
        <ArjunTag dark />
      </div>
      <p className="mt-1 text-[11.5px] text-paper-ink/55">Only you write here. Signal Monitor reads your notes to tailor its suggestions but never changes them.</p>

      <label className="mt-5 block">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">Last contact</span>
        <input
          type="date"
          disabled={!signedIn}
          value={f.last_contact_date}
          onChange={(e) => setF({ ...f, last_contact_date: e.target.value })}
          className={`${field} block [color-scheme:light]`}
        />
      </label>
      <label className="mt-4 block">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">My read on the relationship</span>
        <textarea rows={2} disabled={!signedIn} value={f.relationship_read} onChange={(e) => setF({ ...f, relationship_read: e.target.value })} className={field} />
      </label>
      <label className="mt-4 block">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper-ink/50">Notes</span>
        <textarea rows={6} disabled={!signedIn} value={f.arjun_notes} onChange={(e) => setF({ ...f, arjun_notes: e.target.value })} className={field} />
      </label>

      <div className="mt-4 flex items-center gap-3">
        {signedIn ? (
          <button
            onClick={save}
            disabled={!dirty || state === "saving"}
            className="rounded-lg bg-paper-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-black disabled:opacity-40"
          >
            {state === "saving" ? "Saving…" : "Save notes"}
          </button>
        ) : (
          <a href="/login" className="text-[13px] text-paper-ink/70 underline">Sign in to edit</a>
        )}
        {state === "saved" && !dirty && <span className="text-[12px] text-[#3f6b2a]">Saved ✓</span>}
        {state !== "idle" && state !== "saving" && state !== "saved" && <span className="text-[12px] text-[#b4441f]">{state}</span>}
      </div>
    </div>
  );
}
