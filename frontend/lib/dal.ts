import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/session";

/**
 * Secure session check for Route Handlers (API routes).
 * Returns the session when valid, or a 401 NextResponse that the caller
 * should return immediately. Always guard with:
 *
 *   const session = await requireApiSession();
 *   if (session instanceof NextResponse) return session;
 */
export async function requireApiSession(): Promise<
  SessionPayload | NextResponse
> {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  return session;
}
