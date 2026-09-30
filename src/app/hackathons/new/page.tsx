import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/admin";
import { HackathonForm } from "@/components/hackathon/hackathon-form";
import { AdminDenied } from "@/components/hackathon/admin-denied";

export const metadata = { title: "Post a hackathon" };

/**
 * Post a hackathon — ADMIN ONLY (email allow-listed in ADMIN_EMAILS).
 * Server-side gate; the POST /api/hackathons route re-checks the role.
 */
export default async function NewHackathonPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserRole(session.user.id);
  if (role !== "admin") return <AdminDenied />;

  return (
    <div className="pt-8 pb-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Post a hackathon
        </h1>
        <p className="text-muted-foreground mt-1">
          Club fest, college event or national hackathon — list it so teams can form here.
          You&apos;re signed in as an organizer.
        </p>
      </div>
      <HackathonForm />
    </div>
  );
}
