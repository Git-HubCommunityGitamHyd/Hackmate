import { redirect } from "next/navigation";

/**
 * `/teams` has no index view of its own — browsing recruiting teams is the
 * second tab of Discover. Redirect there with the tab pre-selected so the
 * URL stays shareable (`/?tab=teams`) and nobody ever lands on a 404 by
 * typing this path or following a stale link.
 */
export default function TeamsIndexPage() {
  redirect("/?tab=teams");
}
