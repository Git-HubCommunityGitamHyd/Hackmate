"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Logo } from "@/components/shared/logo";
import { KarmaPill } from "@/components/reputation/karma-pill";
import { CommandMenu } from "./command-menu";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/my-team", label: "My Team" },
  { href: "/saved", label: "Saved" },
];

/**
 * Header, rebuilt.
 *
 * What changed vs the old navbar, feature-for-feature (nothing removed):
 *  1. Scroll-aware elevation — transparent at the top of the page, gains a
 *     frosted background + hairline border once content scrolls under it,
 *     so page content never collides with sticky nav text.
 *  2. The active tab is an animated sliding pill (framer-motion layoutId)
 *     instead of a static underline — the moving affordance makes "where
 *     am I" legible at a glance.
 *  3. A ⌘K command palette trigger sits in the header (jump to any page,
 *     toggle theme, sign out) — keyboard-first UX for a dev audience.
 *  4. The notification badge pops with a spring when its count changes,
 *     instead of silently appearing.
 *  5. The mobile menu animates links in with a stagger and closes via an
 *     explicit X, with the same items the desktop menu has.
 *  6. Height shrinks 16px→14px on scroll — subtle, premium, keeps viewport.
 * Round 2:
 *  7. The bell opens a glass preview popover — triage the last few
 *     notifications and pending invites without leaving the page.
 *  8. The account menu shows live karma, so reputation is always one glance
 *     away (the number updates after results are recorded).
 *  9. Skip-to-content link for keyboard users.
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

  /* Scroll elevation — one listener, passive, rAF-throttled. */
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

  /* Close the mobile menu on route change — render-time state adjustment
     (the React-docs pattern; avoids setState-in-effect). */
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
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border supports-[backdrop-filter]:bg-background/65 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]"
          : "bg-background/40 backdrop-blur-sm border-b border-transparent",
      )}
    >
      {/* Keyboard users land here first — skip the nav entirely. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:rounded-sm focus:border focus:border-primary/50"
      >
        Skip to content
      </a>
      {/* Fluted hairline under the header — vertical rib accent */}
      <div className="flute-edge" aria-hidden="true" />

      <div
        className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 transition-[height] duration-300",
          scrolled ? "h-14" : "h-16",
        )}
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="HackMate home"
        >
          <span className="transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-105">
            <Logo className="h-8 w-8" />
          </span>
          <span className="font-extrabold text-lg tracking-tight hidden sm:inline">
            Hack<span className="text-primary">Mate</span>
          </span>
        </Link>

        {/* Desktop nav with animated active pill */}
        <nav
          className="hidden md:flex items-center gap-1 ml-4 h-full"
          aria-label="Primary"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={active}
                className={cn(
                  "relative px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  link.href === "/admin" && !active && "text-primary/70 hover:text-primary",
                )}
              >
                {active && !reduceMotion && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-sm bg-primary/10 ring-1 ring-primary/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {active && reduceMotion && (
                  <span className="absolute inset-0 -z-10 rounded-sm bg-primary/10 ring-1 ring-primary/25" />
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
                  className="relative"
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
              <PopoverContent align="end" className="w-80 p-0 rounded-sm">
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
                        className="block px-2.5 py-2 rounded-sm hover:bg-muted/60 transition-colors"
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
                        className="block px-2.5 py-2 rounded-sm hover:bg-muted/60 transition-colors"
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

            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Saved items">
              <Link href="/saved">
                <Bookmark className="h-5 w-5" />
              </Link>
            </Button>

            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex font-semibold">
                <Link href="/hackathons/new">
                  <Trophy className="h-4 w-4 mr-1.5" /> Post hackathon
                </Link>
              </Button>
            )}

            {/* Account menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="border border-border hover:border-primary/60 hover:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)] transition-all p-0.5 rounded-full"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    {user?.image && <AvatarImage src={user.image} alt={user.name ?? "avatar"} />}
                    <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
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
          <Button asChild size="sm" className="font-bold">
            <Link href="/login">Sign in</Link>
          </Button>
        )}

        {/* Mobile trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu — slide-down panel with staggered links */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl"
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
                      "flex items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] rounded-sm transition-colors",
                      isActive(link.href)
                        ? "text-primary bg-primary/10"
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
                  <div className="h-px bg-border my-2" />
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * navLinks.length, duration: 0.25 }}
                  >
                    <Link
                      href="/notifications"
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-sm flex items-center gap-2"
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
                        className="px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-primary/80 hover:text-primary hover:bg-muted/60 rounded-sm flex items-center gap-2"
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
                      className="px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-sm flex items-center gap-2"
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
