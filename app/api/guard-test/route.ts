import { listAccounts, manualFingerprint, proveWriteGuard } from "@/lib/db";

// Public on purpose: it proves the column guard live and can never change data (sub-transaction, rolled back).
export async function POST() {
  try {
    const accounts = await listAccounts();
    if (!accounts.length) return Response.json({ error: "No accounts yet." }, { status: 400 });
    const target = accounts[0];
    const before = await manualFingerprint();
    const result = await proveWriteGuard(target.id);
    const after = await manualFingerprint();
    return Response.json({ company: target.company_name, ...result, unchanged: before === after });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Guard test failed" }, { status: 500 });
  }
}
