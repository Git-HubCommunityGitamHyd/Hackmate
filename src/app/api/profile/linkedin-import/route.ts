import { eq, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { LinkedInImport } from "@/lib/db/schema";
import { fail, ok, withUser } from "@/lib/api";
import { normalizeLinkedInProfileUrl, parseLinkedInCsv } from "@/lib/linkedin-import";

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  return withUser(async (user) => {
    const form = await req.formData();
    const rawUrl = form.get("linkedinUrl");
    const csv = form.get("csv");
    const hasUrl = typeof rawUrl === "string" && rawUrl.trim().length > 0;
    const hasCsv = csv instanceof File && csv.size > 0;

    if (!hasUrl && !hasCsv) {
      return fail("Provide a LinkedIn profile URL, a CSV export, or both", 422);
    }
    if (csv instanceof File && csv.size > MAX_CSV_BYTES) {
      return fail("CSV files must be 5 MB or smaller", 413);
    }
    if (csv instanceof File && csv.size === 0) {
      return fail("The selected CSV file is empty", 422);
    }
    if (csv !== null && !(csv instanceof File)) {
      return fail("CSV upload is invalid", 422);
    }

    let normalizedUrl: { url: string; username: string } | null = null;
    if (hasUrl) {
      try {
        normalizedUrl = normalizeLinkedInProfileUrl(rawUrl as string);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Invalid LinkedIn URL", 422);
      }
    }

    let imported: LinkedInImport | null = null;
    if (hasCsv && csv instanceof File) {
      try {
        imported = parseLinkedInCsv(await csv.text(), csv.name);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Unable to parse LinkedIn CSV", 422);
      }
    }

    const [current] = await db
      .select({
        bio: schema.users.bio,
        linkedinUrl: schema.users.linkedinUrl,
        linkedinData: schema.users.linkedinData,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    if (!current) return fail("Profile not found", 404);

    const previous = current.linkedinData;
    const linkedinData = imported
      ? {
          headline: previous?.headline || imported.headline,
          about: previous?.about || imported.about,
          experiences:
            previous?.experiences.length ? previous.experiences : imported.experiences,
          education: previous?.education.length ? previous.education : imported.education,
          skills: previous?.skills.length ? previous.skills : imported.skills,
        }
      : previous;
    const update: {
      updatedAt: Date;
      linkedinUrl?: SQL;
      linkedinData?: LinkedInImport | null;
      bio?: SQL;
    } = { updatedAt: new Date() };

    if (normalizedUrl) {
      update.linkedinUrl = sql`CASE
        WHEN ${schema.users.linkedinUrl} IS NULL OR trim(${schema.users.linkedinUrl}) = ''
        THEN ${normalizedUrl.url}
        ELSE ${schema.users.linkedinUrl}
      END`;
    }
    if (imported) update.linkedinData = linkedinData;
    if (imported?.about) {
      update.bio = sql`CASE
        WHEN ${schema.users.bio} IS NULL OR trim(${schema.users.bio}) = ''
        THEN ${imported.about}
        ELSE ${schema.users.bio}
      END`;
    }

    const [saved] = await db
      .update(schema.users)
      .set(update)
      .where(eq(schema.users.id, user.id))
      .returning({
        linkedinUrl: schema.users.linkedinUrl,
        bio: schema.users.bio,
      });

    return ok({
      linkedinUrl: saved.linkedinUrl,
      linkedinData,
      bio: saved.bio,
      bioFilled: !!imported?.about && !current.bio?.trim(),
    });
  });
}
