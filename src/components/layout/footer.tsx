import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * SiteFooter — a DEBOSSED well pressed into the foot of the page.
 *
 * The inverse of a raised footer bar: shadow creeps in from the top
 * edge (`.debossed-well`), a hairline of light catches the bottom lip,
 * and the surface stays frosted-translucent so the fluted wall behind
 * it reads through. The jade flute line sits INSIDE the well now, like
 * an inlay at the bottom of a pressed tray.
 */
export function SiteFooter() {
  return (
    <footer className="debossed-well mt-auto backdrop-blur-xl supports-[backdrop-filter]:bg-background/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" alt="" />
          <span className="font-bold text-foreground tracking-tight">HackMate</span>
          <span className="hidden sm:inline label-harsh">— find your people, win your hackathon</span>
        </div>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <Link href="/" className="label-harsh hover:text-primary transition-colors">Discover</Link>
          <Link href="/login" className="label-harsh hover:text-primary transition-colors">Sign in</Link>
          <span className="hidden sm:inline label-harsh">v0.1 · Alpha</span>
        </nav>
      </div>
      {/* Jade inlay line at the bottom of the pressed tray */}
      <div className="flute-edge mb-2 opacity-40" aria-hidden="true" />
    </footer>
  );
}
