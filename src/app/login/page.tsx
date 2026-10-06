import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginClient } from "./login-client";

/**
 * The login screen is the default landing page of HackMate. Unauthenticated
 * visitors are sent here by the middleware (root `/` is session-gated);
 * authenticated visitors are bounced straight to Discover so they never see
 * a sign-in form twice.
 *
 * The session check is server side and database-validated (not just cookie
 * presence), so a stale browser cookie can never trap a user in a redirect
 * loop between `/` and `/login`.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return <LoginClient />;
}
