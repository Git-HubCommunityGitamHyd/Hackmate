import { redirect, notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/admin";
import { getHackathonBySlugOrId } from "@/lib/queries/hackathons";
import { HackathonForm } from "@/components/hackathon/hackathon-form";
import { AdminDenied } from "@/components/hackathon/admin-denied";

export const metadata = { title: "Edit hackathon" };

/** Edit a hackathon listing — ADMIN ONLY. Accepts slug or UUID. */
export default async function EditHackathonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserRole(session.user.id);
  if (role !== "admin") return <AdminDenied />;

  const { slug } = await params;
  const hackathon = await getHackathonBySlugOrId(slug);
  if (!hackathon) notFound();

  return (
    <div className="pt-8 pb-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Pencil className="h-6 w-6 text-primary" /> Edit hackathon
        </h1>
        <p className="text-muted-foreground mt-1">
          Updating <span className="font-semibold text-foreground">{hackathon.name}</span>. Teams and
          members are untouched — only the listing details change.
        </p>
      </div>

      <HackathonForm
        initial={{
          id: hackathon.id,
          slug: hackathon.slug,
          name: hackathon.name,
          tagline: hackathon.tagline ?? "",
          description: hackathon.description ?? "",
          organizer: hackathon.organizer ?? "",
          startsAt: hackathon.startsAt.toISOString(),
          endsAt: hackathon.endsAt.toISOString(),
          registrationDeadline: hackathon.registrationDeadline?.toISOString() ?? null,
          teamSizeMin: hackathon.teamSizeMin,
          teamSizeMax: hackathon.teamSizeMax,
          prizePool: hackathon.prizePool ?? "",
          mode: hackathon.mode,
          location: hackathon.location ?? "",
          websiteUrl: hackathon.websiteUrl ?? "",
          themes: hackathon.themes ?? [],
        }}
      />
    </div>
  );
}
