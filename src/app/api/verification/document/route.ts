import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fail, requireUser } from "@/lib/api";
import { readCollegeIdImage } from "@/lib/verification/storage";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);

  const [document] = await db
    .select({ pathname: schema.users.idVerificationImagePath })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, user.id),
        isNotNull(schema.users.idVerificationImagePath),
      ),
    )
    .limit(1);
  if (!document?.pathname) return fail("College ID image not found.", 404);

  const body = await readCollegeIdImage(document.pathname);
  if (!body) return fail("College ID image not found.", 404);
  const responseBody = Buffer.isBuffer(body) ? new Uint8Array(body) : body;
  return new Response(responseBody, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'attachment; filename="college-id.jpg"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
