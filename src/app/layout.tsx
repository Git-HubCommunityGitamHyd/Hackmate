import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/footer";
import { CursorField } from "@/components/ui/cursor-field";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HackMate — Find your hackathon team",
    template: "%s · HackMate",
  },
  description:
    "Students discover hackathons, find compatible teammates, form balanced teams and collaborate until submission. Team Composition Intelligence tells you what your team is missing.",
  keywords: [
    "hackathon",
    "team finder",
    "students",
    "teammates",
    "team matching",
  ],
  /* Favicon = the same /public/logo.svg the navbar, footer and login
     page render. Replace that one file and the favicon follows. */
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Providers>
          {/* The one background of every page, bottom to top:
              1. the radiance-cascades field — omnidirectional multi-scale
                 soft diffusion over the black ink canvas (no key light,
                 no noise, same on every page),
              2. the CursorField — the ink pixel wake that follows the
                 pointer (matte ink, no light),
              3. the app itself, whose frosted debossed panes blur both
                 layers as they pass beneath them. */}
          <div aria-hidden="true" className="radiance-field fixed inset-0 -z-20" />
          <CursorField />
          <Navbar />
          <main id="main-content" className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
