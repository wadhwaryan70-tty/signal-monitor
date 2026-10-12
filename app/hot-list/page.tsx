import { Nav } from "@/components/Nav";
import { hotListSubject } from "@/lib/email";
import { buildHotList } from "@/lib/pipeline";
import { isSignedIn } from "@/lib/session";
import { fmtIST, nextScheduledRun } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function HotListPage() {
  const signedIn = await isSignedIn();
  const list = await buildHotList().catch(() => []);
  return (
    <>
      <Nav active="hotlist" signedIn={signedIn} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
        <div className="label">Hot List email</div>
        <h1 className="mt-2 font-serif text-[48px] leading-[1.05] text-text">Your Hot List.</h1>
        <p className="mt-3 max-w-2xl text-[14.5px] text-mute">
          Every Monday and Thursday at 07:30 IST you get an email with up to ten accounts that had a real trigger in the last three days —
          what changed, why it&apos;s the right moment, and a suggested angle for your message. This is exactly how it looks right now. Next email: <b className="text-text">{fmtIST(nextScheduledRun().toISOString())} IST</b>.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <div className="ml-3 min-w-0 text-[12px]">
              <div className="truncate text-text">{hotListSubject(list)}</div>
              <div className="truncate text-faint">From: Signal Monitor · To: you</div>
            </div>
          </div>
          <iframe src="/api/hotlist" title="Hot List email preview" className="h-[1100px] w-full bg-white" />
        </div>
      </main>
    </>
  );
}
