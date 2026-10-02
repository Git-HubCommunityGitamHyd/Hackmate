import { cn } from "@/lib/utils";

/**
 * Logo — the HackMate mark, loaded from ONE file: `/public/logo.svg`.
 *
 * Every surface (navbar, footer, login page) and the favicon (via
 * `metadata.icons` in app/layout.tsx) point at the same asset, so
 * swapping in your own logo is a single file replace. See LOGO.md.
 *
 * The mark is theme-independent (it carries its own ink-glass tile),
 * so it reads correctly on both the dark and light ink-wash themes.
 */
export function Logo({
  className,
  alt = "HackMate",
}: {
  className?: string;
  /** Screen-reader text; pass "" for decorative placements. */
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG asset, no optimizer needed
    <img
      src="/logo.svg"
      alt={alt}
      width={64}
      height={64}
      aria-hidden={alt === "" ? true : undefined}
      draggable={false}
      className={cn("select-none object-contain", className)}
    />
  );
}
