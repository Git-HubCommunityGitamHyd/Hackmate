import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * SiteFooter - the floating bottom counterpart of the navbar dock.
 *
 * A slab of rough frost recessed into the fluted wall, exactly the
 * dock's width rhythm (max-w-5xl, inset from the viewport edges by
 * the same padding) so the two bookend the page as a pair of floating
 * trays. Rounded with the one shared radius, debossed with the same
 * hard-surface recipe: crisp ceiling lip on top, light catch on the
 * bottom edge, soft AO pool at the floor. No divider lines - the
 * material and the recess do all the separating.
 */
export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto px-3 pb-3 sm:px-5 sm:pb-4">
      <div className="deboss-tray mx-auto max-w-5xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" alt="" />
            <span className="font-bold text-foreground tracking-tight">HackMate</span>
            <span className="hidden sm:inline label-harsh">· find your people, win your hackathon</span>
          </div>
          <nav className="flex items-center gap-5" aria-label="Footer">
            <Link href="/" className="label-harsh hover:text-primary transition-colors">Discover</Link>
            <Link href="/login" className="label-harsh hover:text-primary transition-colors">Sign in</Link>
            <span className="hidden sm:inline label-harsh">v0.1 · Alpha</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
