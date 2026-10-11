"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.refresh();
      }}
      className="rounded-md px-2 py-1 text-faint transition hover:text-text"
    >
      Sign out
    </button>
  );
}
