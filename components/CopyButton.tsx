"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy angle" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="rounded-md border border-line-2 px-2 py-1 font-mono text-[10.5px] text-mute transition hover:border-hot/50 hover:text-text"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
