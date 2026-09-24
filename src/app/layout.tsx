import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/footer";

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
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
