"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Compass,
  Users,
  Bookmark,
  Bell,
  User as UserIcon,
  Pencil,
  Trophy,
  ShieldCheck,
  ShieldAlert,
  Search,
  LogOut,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/**
 * Global ⌘K command palette.
 *
 * Opens with Cmd/Ctrl+K (or the navbar search button). Groups:
 *  - Navigation: every page the user can reach
 *  - Actions: theme toggle, sign out
 *
 * Keyboard-first navigation is the single biggest UX upgrade for a
 * keyboard-heavy audience (hackathon devs), and it doubles as a
 * discoverable site map for first-time users.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const isAdmin = session?.user?.role === "admin";
  const authenticated = status === "authenticated";

  /* Global shortcut: Cmd+K / Ctrl+K. ("/" stays reserved for the
     Discover search bar - two different shortcuts, two different jobs.) */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      /* Warm the route while the palette closes - feels instant. */
      router.prefetch?.(href);
      router.push(href);
    },
    [router],
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setOpen(false);
    toast.success(next === "dark" ? "Dark mode" : "Light mode");
  }, [theme, setTheme]);

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="rounded-lg"
      >
        <CommandInput placeholder="Jump to a page or run an action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => go("/")}>
              <Compass className="mr-2 h-4 w-4" />
              Discover
              <CommandShortcut>home</CommandShortcut>
            </CommandItem>
            {authenticated && (
              <>
                <CommandItem onSelect={() => go("/my-team")}>
                  <Users className="mr-2 h-4 w-4" />
                  My Team workspace
                </CommandItem>
                <CommandItem onSelect={() => go("/saved")}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved items
                </CommandItem>
                <CommandItem onSelect={() => go("/notifications")}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </CommandItem>
                <CommandItem
                  onSelect={() => go(`/profile/${session?.user?.id}`)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  My profile
                </CommandItem>
                <CommandItem onSelect={() => go("/profile/edit")}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit profile
                </CommandItem>
                <CommandItem onSelect={() => go("/teams/new")}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create a team
                </CommandItem>
              </>
            )}
          </CommandGroup>

          {isAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Organizer">
                <CommandItem onSelect={() => go("/hackathons/new")}>
                  <Trophy className="mr-2 h-4 w-4" />
                  Post a hackathon
                </CommandItem>
                <CommandItem onSelect={() => go("/admin")}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Organizer console
                </CommandItem>
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              Toggle theme
            </CommandItem>
            {authenticated ? (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </CommandItem>
            ) : (
              <CommandItem onSelect={() => go("/login")}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign in
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Safety">
            <CommandItem onSelect={() => go("/emergency")}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Emergency mode
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="embossed hidden md:flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/70 transition-colors px-3 h-8 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Open command menu (Control K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="font-medium">Search</span>
        <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-sm border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-[9px]">Ctrl</span>K
        </kbd>
      </button>
    </>
  );
}

