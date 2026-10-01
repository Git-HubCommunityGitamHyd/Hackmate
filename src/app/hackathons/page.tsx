import { redirect } from "next/navigation";

/**
 * `/hackathons` has no index view of its own — browsing hackathons is the
 * first tab of Discover. Redirect there with the tab pre-selected so the
 * URL stays shareable (`/?tab=hackathons`) and nobody ever lands on a 404
 * by typing this path or following a stale link.
 */
export default function HackathonsIndexPage() {
  redirect("/?tab=hackathons");
}
