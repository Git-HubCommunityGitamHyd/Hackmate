"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Menu,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { KarmaPill } from "@/components/reputation/karma-pill";
import { SplineObject } from "@/components/ui/spline-object";
import { CommandMenu } from "./command-menu";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/my-team", label: "My Team" },
  { href: "/saved", label: "Saved" },
];

/**
 * Header, round 3 — floating ink dock.
 *
 * The old full-width sticky bar is gone. What ships now:
 *  - A detached floating dock (rounded, frosted, minimally embossed:
 *    one light top line, one dark bottom line, deep float shadow) that
 *    hovers a few pixels below the viewport edge and never touches the
 *    sides — "floating and minimal embossed", per the design brief.
 *  - The brand emblem is a live Spline 3D object (lazy-loaded, with a
 *    breathing ink-orb fallback when offline), animated by the Spline
 *    runtime; the wordmark stays a plain Link.
 *  - The dock entrance (drop + settle) and the nav-link stagger run on
 *    anime.js, not framer-motion, keeping the animation stack mixed on
 *    purpose: anime for one-shot entrances, framer for stateful UI.
 * Everything else from round 2 is kept: sliding active pill, ⌘K palette,
 * notification preview popover, karma in the account menu, springy
 * badge, skip link, animated mobile menu, scroll shrink.
 */
export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { data: notifications } = useNotifications(status === "authenticated");
  const unread = (notifications?.notifications ?? []).filter((n) => !n.read).length;
  const pendingInvites = notifications?.invites?.length ?? 0;
  const badgeCount = unread + pendingInvites;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  const dockRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  /* Anime.js one-shot entrance: dock drops in, links stagger. */
  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    (async () => {
      const { animate, stagger } = await import("animejs");
      if (cancelled) return;
      if (dockRef.current) {
        animate(dockRef.current, {
          translateY: [-18, 0],
          opacity: [0, 1],
          duration: 620,
          ease: "out(3)",
        });
      }
      const links = navRef.current?.querySelectorAll("[data-nav-link]");
      if (links && links.length > 0) {
        animate(Array.from(links), {
          opacity: [0, 1],
          translateX: [10, 0],
          duration: 480,
          delay: stagger(70, { start: 180 }),
          ease: "out(3)",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  /* Scroll elevation — dock tightens slightly. */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close the mobile menu on route change. */
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }

  /* Lock body scroll while the mobile menu is open. */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const initials = (user?.name ?? user?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navLinks = isAdmin
    ? [...NAV_LINKS, { href: "/admin", label: "Admin" }]
    : NAV_LINKS;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-5 sm:pt-4">
      {/* Keyboard users land here first — skip the nav entirely. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:rounded-full focus:border focus:border-primary/50"
      >
        Skip to content
      </a>

      {/* The floating embossed dock */}
      <div
        ref={dockRef}
        className={cn(
          "emboss-dock ink-edge mx-auto flex w-full max-w-5xl items-center gap-3 rounded-full px-3 sm:px-4",
          "transition-[height,padding,box-shadow] duration-300",
          scrolled ? "h-12" : "h-14",
        )}
        style={{ borderRadius: 999 }}
      >
        {/* Brand: Spline 3D emblem + wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 group"
          aria-label="HackMate home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[8deg]">
            <SplineObject width={36} height={36} className="rounded-full" />
          </span>
          <span className="hidden font-extrabold tracking-tight sm:inline">
            Hack<span className="text-primary">Mate</span>
          </span>
        </Link>

        {/* Desktop nav with animated active pill */}
        <nav
          ref={navRef}
          className="hidden items-center gap-1 ml-2 md:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-nav-link
                data-active={active}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  link.href === "/admin" && !active && "text-primary/70 hover:text-primary",
                )}
              >
                {active && !reduceMotion && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary/10 ring-1 ring-primary/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {active && reduceMotion && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-primary/10 ring-1 ring-primary/25" />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Command palette trigger (desktop) */}
        <div className="hidden md:block">
          <CommandMenu />
        </div>

        {status === "authenticated" ? (
          <>
            {/* Notifications: glass preview popover + springy badge */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full"
                  aria-label={badgeCount > 0 ? `Notifications, ${badgeCount} unread` : "Notifications"}
                >
                  <Bell className={cn("h-5 w-5 transition-transform duration-300", scrolled && "h-[18px] w-[18px]")} />
                  <AnimatePresence>
                    {badgeCount > 0 && (
                      <motion.span
                        key={badgeCount}
                        initial={reduceMotion ? false : { scale: 0, y: -4 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1 rounded-full"
                      >
                        {badgeCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 rounded-[6px] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold">Notifications</p>
                  {badgeCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-bold">{badgeCount} new</Badge>
                  )}
                </div>
                <ScrollArea className="h-72">
                  <div className="px-2 py-2 space-y-1">
                    {(notifications?.invites ?? []).slice(0, 3).map((i) => (
                      <Link
                        key={`invite-${i.id}`}
                        href="/notifications"
                        className="block px-2.5 py-2 rounded-[4px] hover:bg-muted/60 transition-colors"
                      >
                        <p className="text-xs font-semibold line-clamp-2">
                          <span className="text-primary">Invite</span> · {i.inviterName} wants you on {i.teamName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {i.hackathonName ?? "Idea-first team"}
                        </p>
                      </Link>
                    ))}
                    {(notifications?.notifications ?? []).slice(0, 5).map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? "/notifications"}
                        className="block px-2.5 py-2 rounded-[4px] hover:bg-muted/60 transition-colors"
                      >
                        <p className={cn("text-xs line-clamp-2", !n.read && "font-semibold")}>{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
                      </Link>
                    ))}
                    {badgeCount === 0 && (notifications?.notifications ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8 px-4">
                        Quiet for now. Invites and team updates land here.
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t border-border p-2">
                  <Button asChild variant="ghost" size="sm" className="w-full text-xs font-bold">
                    <Link href="/notifications">View all notifications</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="Saved items">
              <Link href="/saved">
                <Bookmark className="h-5 w-5" />
              </Link>
            </Button>

            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="hidden rounded-full font-semibold lg:inline-flex">
                <Link href="/hackathons/new">
                  <Trophy className="h-4 w-4 mr-1.5" /> Post hackathon
                </Link>
              </Button>
            )}

            {/* Account menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full border border-border p-0.5 transition-all hover:border-primary/60 hover:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    {user?.image && <AvatarImage src={user.image} alt={user.name ?? "avatar"} />}
                    <AvatarFallback className="bg-primary/15 font-semibold text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{user?.name ?? "Student"}</span>
                      {user?.id && <KarmaPill userId={user.id} />}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    {isAdmin && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-3 w-3" /> Organizer / admin
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/hackathons/new" className="cursor-pointer">
                        <Trophy className="mr-2 h-4 w-4" /> Post hackathon
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Organizer console
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user?.id}`} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" /> My profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" /> Edit profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-team" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" /> Team workspace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/emergency" className="cursor-pointer">
                    <ShieldAlert className="mr-2 h-4 w-4" /> Emergency mode
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button asChild size="sm" className="rounded-full font-bold">
            <Link href="/login">Sign in</Link>
          </Button>
        )}

        {/* Mobile trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu — floating slide-down panel, staggered links */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="emboss-dock mx-auto mt-2 max-w-5xl overflow-hidden rounded-[14px] md:hidden"
            aria-label="Mobile"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-full px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] transition-colors",
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {link.label}
                    {isActive(link.href) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                </motion.div>
              ))}

              {status === "authenticated" && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * navLinks.length, duration: 0.25 }}
                  >
                    <Link
                      href="/notifications"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <Bell className="h-4 w-4" /> Notifications
                      {badgeCount > 0 && <Badge variant="destructive" className="ml-auto">{badgeCount}</Badge>}
                    </Link>
                  </motion.div>
                  {isAdmin && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * (navLinks.length + 1), duration: 0.25 }}
                    >
                      <Link
                        href="/hackathons/new"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-primary/80 hover:text-primary hover:bg-muted/60"
                      >
                        <Trophy className="h-4 w-4" /> Post hackathon
                      </Link>
                    </motion.div>
                  )}
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * (navLinks.length + 2), duration: 0.25 }}
                  >
                    <Link
                      href="/emergency"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    >
                      <ShieldAlert className="h-4 w-4" /> Emergency mode
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
