import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="font-serif text-[56px] text-text">No signal.</div>
        <p className="mt-2 text-mute">That page isn&apos;t on the radar.</p>
        <Link href="/" className="mt-6 inline-block text-hot">← Back to the radar</Link>
      </div>
    </main>
  );
}
