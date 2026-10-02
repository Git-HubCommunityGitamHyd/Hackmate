import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * SiteFooter — a floating EMBOSSED tray, the bottom counterpart of the
 * navbar dock.
 *
 * Rounded with the one shared radius and inset from the viewport edges
 * so it reads as a physical raised slab, not an edge-to-edge strip:
 * the top-left key light catches its top edge as a bright hairline,
 * the far edge shades, a diagonal sheen sweeps the interior, and one
 * wide penumbra floats it off the canvas. The surface stays frosted —
 * translucent + backdrop blur — and the jade flute inlay sits along
 * the lit top edge, where light would catch it.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto px-3 pb-3 sm:px-5 sm:pb-4">
      <div className="embossed-tray backdrop-blur-xl">
        {/* Jade inlay along the lit top edge */}
        <div className="flute-edge mt-2 opacity-40" aria-hidden="true" />
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
      </div>
    </footer>
  );
}
