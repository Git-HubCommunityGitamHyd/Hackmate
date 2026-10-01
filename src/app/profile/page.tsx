import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * `/profile` — "my profile" shortcut. Authenticated visitors are sent to
 * their own public profile page (`/profile/{id}`); everyone else is sent
 * to sign in first (the login screen is the app's hero page, so an
 * unauthenticated visitor never sees a dead end here).
 */
export default async function ProfileIndexPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect(`/profile/${session.user.id}`);
  }

  redirect("/login?callbackUrl=/profile");
}
