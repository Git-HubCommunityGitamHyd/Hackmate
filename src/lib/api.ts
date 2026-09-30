import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/admin";

/** Standard JSON API helpers with auth guard. */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route params are user input. A malformed id must produce a clean 404,
 * never reach Postgres (which would 500 on "invalid input syntax for
 * type uuid"). Found by the pentest suite; fixed centrally here.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Returns the signed-in user with a non-nullable id (Auth.js v5 types id as optional). */
export async function requireUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return {
    id,
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
    image: session.user?.image ?? null,
  };
}

export async function withUser<T>(
  handler: (user: { id: string; name?: string | null; email?: string | null }) => Promise<T>,
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  try {
    const result = await handler(user);
    if (result instanceof NextResponse) return result;
    return ok(result);
  } catch (err: any) {
    /* Full detail goes to the server log only. The client gets a generic
       message: thrown errors here are internal invariants ("AUTH_SECRET is
       not configured", driver errors, …) — leaking them exposes schema,
       file paths and env state. */
    console.error("[api:error]", err);
    return fail("Internal server error", 500);
  }
}

export async function withPublic<T>(handler: () => Promise<T>) {
  try {
    const result = await handler();
    if (result instanceof NextResponse) return result;
    return ok(result);
  } catch (err: any) {
    console.error("[api:error]", err);
    return fail("Internal server error", 500);
  }
}

/** Admin guard: 401 when signed out, 403 when not an admin (role checked in DB). */
export async function withAdmin<T>(
  handler: (user: { id: string; name?: string | null; email?: string | null }) => Promise<T>,
) {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return fail("Unauthorized — sign in first", 401);
  const role = await getUserRole(id);
  if (role !== "admin") {
    return fail(
      "Admin access required. Add your email to ADMIN_EMAILS in your environment, then sign in again.",
      403,
    );
  }
  const user = {
    id,
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
  };
  try {
    const result = await handler(user);
    if (result instanceof NextResponse) return result;
    return ok(result);
  } catch (err: any) {
    console.error("[api:error]", err);
    return fail(err?.message ?? "Internal server error", 500);
  }
}
