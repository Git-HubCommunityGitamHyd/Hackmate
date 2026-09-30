import { redirect } from "next/navigation";
import { ShieldCheck, Plus } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { AdminDenied } from "@/components/hackathon/admin-denied";
import { AdminHackathonsTable } from "@/components/hackathon/admin-hackathons-table";

export const metadata = { title: "Admin — hackathons" };

/**
 * Organizer console — ADMIN ONLY. List / edit / delete every hackathon
 * listing and post new ones. Gate is server-side; APIs re-check the role.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserRole(session.user.id);
  if (role !== "admin") return <AdminDenied />;

  return (
    <div className="pt-8 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-extrabold tracking-tight">Organizer console</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            You&apos;re signed in as an admin ({session.user?.email}). Only emails listed in
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 mx-1">ADMIN_EMAILS</code>
            get this access.
          </p>
        </div>
        <Button asChild className="font-semibold">
          <Link href="/hackathons/new">
            <Plus className="h-4 w-4 mr-2" /> Post a hackathon
          </Link>
        </Button>
      </div>

      <AdminHackathonsTable />
    </div>
  );
}
