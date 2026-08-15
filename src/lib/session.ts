import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * The single authorization boundary for the app. Every route that touches user data
 * calls this first and returns 401 on null, before any database query runs.
 *
 * The security property that matters: the user id comes from the server-side session
 * (a signed JWT), never from a request body, query string, or header. A client cannot
 * request another user's data by tampering with an id it controls, because it never
 * supplies one — no route in this codebase accepts a userId parameter. Every query
 * downstream is then scoped by this value.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
