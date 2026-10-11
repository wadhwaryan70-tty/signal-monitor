import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./auth";

// Viewing the dashboard is open (so the submission URL works for reviewers); every action that writes,
// scans or sends email needs Arjun's password.

export async function isSignedIn(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For route handlers: returns a 401 Response when not signed in, else null. */
export async function apiAuthError(): Promise<Response | null> {
  return (await isSignedIn()) ? null : Response.json({ error: "Sign in to do this." }, { status: 401 });
}
