import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/35">
      <div className="flute-edge" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-bold text-foreground tracking-tight">HackMate</span>
          <span className="hidden sm:inline label-harsh">— find your people, win your hackathon</span>
        </div>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <Link href="/" className="label-harsh hover:text-primary transition-colors">Discover</Link>
          <Link href="/login" className="label-harsh hover:text-primary transition-colors">Sign in</Link>
          <span className="hidden sm:inline label-harsh">built by students · $0/month stack</span>
        </nav>
      </div>
    </footer>
  );
}
