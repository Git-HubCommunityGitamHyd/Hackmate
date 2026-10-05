import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bestWorkSchema } from "@/lib/validations";
import { fail, ok, withUser } from "@/lib/api";
import { getProfile } from "@/lib/queries/people";

export async function PATCH(req: NextRequest) {
  return withUser(async (user) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body", 422);
    }
    const parsed = bestWorkSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid best work payload", 422);
    }

    if (parsed.data.githubProject) {
      const repoPath = new URL(parsed.data.githubProject.repoUrl).pathname
        .replace(/^\/|\/$/g, "")
        .split("/");
      const githubResponse = await fetch(
        `https://api.github.com/repos/${repoPath[0]}/${repoPath[1]}`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!githubResponse.ok) {
        return fail("That GitHub repository was not found or is private.", 422);
      }
      const githubRepo = (await githubResponse.json()) as { private?: boolean };
      if (githubRepo.private === true) {
        return fail("That GitHub repository was not found or is private.", 422);
      }
    }

    let result:
      | { kind: "not-found" }
      | { kind: "ok"; bestWork: unknown };
    try {
      result = await db.transaction(async (tx) => {
        const [lockedUser] = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .for("update");
        if (!lockedUser) return { kind: "not-found" as const };

        await tx
          .update(schema.hackathonResults)
          .set({ isBestWork: false })
          .where(eq(schema.hackathonResults.userId, user.id));
        if (parsed.data.githubProject) {
          await tx
            .insert(schema.githubProjects)
            .values({
              userId: user.id,
              title: parsed.data.githubProject.title,
              description: parsed.data.githubProject.description,
              repoUrl: parsed.data.githubProject.repoUrl,
              technologies: parsed.data.githubProject.technologies,
              isBestWork: true,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.githubProjects.userId,
              set: {
                title: parsed.data.githubProject.title,
                description: parsed.data.githubProject.description,
                repoUrl: parsed.data.githubProject.repoUrl,
                technologies: parsed.data.githubProject.technologies,
                isBestWork: true,
                updatedAt: new Date(),
              },
            });
          return { kind: "ok" as const, bestWork: true };
        }

        if (parsed.data.resultId === null) {
          await tx
            .update(schema.hackathonResults)
            .set({ isBestWork: false })
            .where(eq(schema.hackathonResults.userId, user.id));
          await tx
            .delete(schema.githubProjects)
            .where(eq(schema.githubProjects.userId, user.id));
          return { kind: "ok" as const, bestWork: null };
        }
        if (!parsed.data.resultId) return { kind: "not-found" as const };

        const [ownedResult] = await tx
          .select()
          .from(schema.hackathonResults)
          .where(eq(schema.hackathonResults.id, parsed.data.resultId))
          .limit(1);
        if (!ownedResult || ownedResult.userId !== user.id) {
          return { kind: "not-found" as const };
        }

        await tx
          .update(schema.hackathonResults)
          .set({ isBestWork: false })
          .where(eq(schema.hackathonResults.userId, user.id));
        await tx
          .delete(schema.githubProjects)
          .where(eq(schema.githubProjects.userId, user.id));
        const [updated] = await tx
          .update(schema.hackathonResults)
          .set({ isBestWork: true })
          .where(eq(schema.hackathonResults.id, ownedResult.id))
          .returning();
        return { kind: "ok" as const, bestWork: updated };
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        return fail("Best work was updated concurrently. Please retry.", 409);
      }
      throw error;
    }

    if (result.kind === "not-found") return fail("Hackathon result not found", 404);
    const profile = await getProfile(user.id);
    if (!profile) return fail("Profile not found", 404);
    return ok({ bestWork: result.bestWork ? profile.bestWork : null });
  });
}
