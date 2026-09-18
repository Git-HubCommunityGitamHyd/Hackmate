"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/my-team", label: "My Team" },
  { href: "/saved", label: "Saved" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { data: notifications } = useNotifications(status === "authenticated");
  const unread = (notifications?.notifications ?? []).filter((n) => !n.read).length;
  const pendingInvites = notifications?.invites?.length ?? 0;
  const badgeCount = unread + pendingInvites;
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/45">
      {/* Fluted hairline under the header — vertical rib accent */}
      <div className="flute-edge" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="HackMate home">
          <Logo className="h-8 w-8" />
          <span className="font-extrabold text-lg tracking-tight hidden sm:inline">
            Hack<span className="text-primary">Mate</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-2 h-full" aria-label="Primary">
          {navLinks.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={active}
                className={cn(
                  "nav-link px-3 py-2 text-xs font-bold uppercase tracking-[0.14em]",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  link.href === "/admin" && !active && "text-primary/70 hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {status === "authenticated" ? (
          <>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Notifications${badgeCount ? `, ${badgeCount} unread` : ""}`}
            >
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1">
                    {badgeCount}
                  </span>
                )}
              </Link>
            </Button>

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="border border-border hover:border-primary/50 transition-colors p-0.5" aria-label="Account menu">
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
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold truncate">{user?.name ?? "Student"}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    {isAdmin && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
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

        {/* Mobile nav */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                <Logo className="h-7 w-7" /> HackMate
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em]",
                    (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {status === "authenticated" && (
                <>
                  {isAdmin && (
                    <Link
                      href="/hackathons/new"
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-primary/80 hover:text-primary flex items-center gap-2"
                    >
                      <Trophy className="h-4 w-4" /> Post hackathon
                    </Link>
                  )}
                  <Link
                    href="/notifications"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" /> Notifications
                    {badgeCount > 0 && <Badge variant="destructive" className="ml-auto">{badgeCount}</Badge>}
                  </Link>
                  <Link
                    href="/emergency"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <ShieldAlert className="h-4 w-4" /> Emergency mode
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
